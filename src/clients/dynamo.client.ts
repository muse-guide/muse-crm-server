import {NotFoundException} from "../common/exceptions";
import * as DynamoDB from 'aws-sdk/clients/dynamodb';
import {EntityStructure, KeysInput, Table, TxInput} from "../model/table.model";

export interface PaginatedResults {
    items: EntityStructure[],
    count: number,
    nextPageKey?: string | undefined
}

export interface Pagination {
    pageSize: number,
    nextPageKey?: string
}

export class DynamoClient {
    docClient: DynamoDB.DocumentClient;

    constructor(region?: string) {
        this.docClient = new DynamoDB.DocumentClient({
            region,
            httpOptions: {
                timeout: 2200,
                connectTimeout: 2200,
            },
            maxRetries: 10,
        });
    }

    async getItem({table, keys}: { table: Table, keys: KeysInput }): Promise<EntityStructure> {
        const {partitionKey, sortKey} = keys

        const result = await this.docClient.get({
            TableName: table.name,
            Key: table.resolveKey(partitionKey, sortKey),
        }).promise();

        if (result.Item == undefined) {
            throw new NotFoundException(`Item with id: ${partitionKey} not found for in table: ${table.name}`)
        }
        return result.Item;
    }

    async getAllItems(table: Table, keys: KeysInput): Promise<EntityStructure[]> {
        const {partitionKey} = keys

        const result = await this.docClient.query({
            TableName: table.name,
            KeyConditionExpression: `${table.partitionKey} = :searchItem`,
            ExpressionAttributeValues: {":searchItem": partitionKey}
        }).promise();

        return result.Items ?? [];
    }

    async createItem(table: Table, item: EntityStructure) {
        const result = await this.docClient.put({
            TableName: table.name,
            Item: {...item},
        }).promise();
    }

    async getItemsPaginated({table, keys, pagination}: { table: Table, keys: KeysInput, pagination: Pagination }): Promise<PaginatedResults> {
        let queryResult;
        let items: EntityStructure[] = [];
        const {pageSize, nextPageKey} = pagination

        const dbParams: DynamoDB.DocumentClient.QueryInput = {
            TableName: table.name,
            KeyConditionExpression: `${table.partitionKey} = :searchKey`,
            ExpressionAttributeValues: {
                ":searchKey": keys.partitionKey,
            }
        }

        if (nextPageKey) {
            dbParams.ExclusiveStartKey = JSON.parse(Buffer.from(nextPageKey, "base64").toString())
        }

        do {
            queryResult = await this.docClient.query(dbParams).promise();
            items = items.concat(queryResult.Items as EntityStructure[]);
            dbParams.ExclusiveStartKey = queryResult.LastEvaluatedKey;
        } while (typeof queryResult.LastEvaluatedKey !== "undefined" && items.length < pageSize);

        if (items.length > pageSize) {
            const lastPrimaryKey = items[pageSize - 1][table.partitionKey]
            const lastSortKey = table.sortKey ? items[pageSize - 1][table.sortKey] : undefined

            items.splice(pageSize, items.length - pageSize)
            queryResult.LastEvaluatedKey = table.resolveKey(lastPrimaryKey, lastSortKey)
        }

        const result: PaginatedResults = {
            items: items,
            count: items.length,
        };

        if (queryResult.LastEvaluatedKey) {
            result.nextPageKey = Buffer.from(JSON.stringify(queryResult.LastEvaluatedKey)).toString("base64")
        }

        return result
    }

    async deleteItem(table: Table, keys: KeysInput) {
        const {partitionKey, sortKey} = keys
        const result = await this.docClient.delete({
            TableName: table.name,
            Key: table.resolveKey(partitionKey, sortKey),
        }).promise();
    }

    async updateItem(table: Table, entity: EntityStructure): Promise<EntityStructure> {
        const key = table.resolveKey(entity[table.partitionKey], table.sortKey ? entity[table.sortKey] : undefined)
        const version: number = entity.version
        const newVersion: number = Date.now()

        let updateExpression = 'SET #version = :newVersion, ';
        let conditionExpression = '#version = :versionAtHand';
        const expressionAttributeNames: EntityStructure = {"#version": "version"};
        const expressionAttributeValues: EntityStructure = {":newVersion": newVersion, ":versionAtHand": version};

        Object.entries(entity)
            .filter(([, value]) => typeof value !== 'undefined')
            .filter(([key , ]) => key !== table.partitionKey && key !== table.sortKey && key !== 'version')
            .forEach(([key, value], index, array) => {
                updateExpression += `#${key} = :${key}`;
                expressionAttributeNames[`#${key}`] = key;
                expressionAttributeValues[`:${key}`] = value;

                if (index !== array.length - 1) {
                    updateExpression += ', ';
                }
            });

        await this.docClient.update({
            TableName: table.name,
            Key: key,
            UpdateExpression: updateExpression,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ConditionExpression: conditionExpression,
        }).promise();

        return {
            ...key,
            ...entity,
            version: newVersion,

        }
    }

    /**
     * Runs multiple operations in a transaction.
     *
     * @param txItems - Array of operations to run in the transaction
     * @returns Promise resolving to the transaction result if successful, rejects if failed
     */
    async inTransaction(...txItems: TxInput[]) {
        return await this.docClient.transactWrite({
                TransactItems: txItems
            }
        ).promise()
    }
}

export const client = new DynamoClient(process.env.AWS_REGION ?? "eu-central-1")