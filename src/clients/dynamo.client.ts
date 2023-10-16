import {NotFoundException} from "../common/exceptions";
import {Exhibition} from "../model/exhibition.model";
import * as DynamoDB from 'aws-sdk/clients/dynamodb';
import {ExhibitionSnapshot} from "../model/exhibition-snapshot.model";
import {logger} from "../common/logger";

export type EntityStructure = { [key: string]: any; }

export interface PaginatedResults<T> {
    items: T[],
    count: number,
    nextPageKey?: string | undefined
}

export class DynamoClient<T extends Record<string, any>> {
    tableName: string;
    partitionKey: string
    sortKey?: string
    docClient: DynamoDB.DocumentClient;

    constructor(tableName: string, partitionKey: string, sortKey?: string, region?: string) {
        this.docClient = new DynamoDB.DocumentClient({
            region,
            httpOptions: {
                timeout: 2200,
                connectTimeout: 2200,
            },
            maxRetries: 10,
        });
        this.tableName = tableName
        this.partitionKey = partitionKey
        this.sortKey = sortKey
    }

    async getItem(partitionKeyValue: string, sortKeyValue?: string): Promise<T> {

        const result = await this.docClient.get({
            TableName: this.tableName,
            Key: this.resolveKey(partitionKeyValue, sortKeyValue),
        }).promise();

        if (result.Item == undefined) {
            throw new NotFoundException(`Item with id: ${partitionKeyValue} not found for in table: ${this.tableName}`)
        }
        return result.Item as T;
    }

    async createItem(item: T) {
        const result = await this.docClient.put({
            TableName: this.tableName,
            Item: {...item},
        }).promise();
    }

    async getCustomerItems(customerId: string, pageSize: number, nextPageKey?: string): Promise<PaginatedResults<T>> {
        let queryResult;
        let items: T[] = [];

        const dbParams: DynamoDB.DocumentClient.QueryInput = {
            TableName: this.tableName,
            KeyConditionExpression: `${this.sortKey} = :customerId`,
            ExpressionAttributeValues: {
                ":customerId": customerId,
            }
        }

        if (nextPageKey) {
            dbParams.ExclusiveStartKey = JSON.parse(Buffer.from(nextPageKey, "base64").toString())
        }

        do {
            queryResult = await this.docClient.query(dbParams).promise();
            items = items.concat(queryResult.Items as T[]);
            dbParams.ExclusiveStartKey = queryResult.LastEvaluatedKey;
        } while (typeof queryResult.LastEvaluatedKey !== "undefined" && items.length < pageSize);

        if (items.length > pageSize) {
            const lastPrimaryKey = items[pageSize - 1][this.partitionKey]
            const lastSortKey = this.sortKey ? items[pageSize - 1][this.sortKey] : undefined

            items.splice(pageSize, items.length - pageSize)
            queryResult.LastEvaluatedKey = this.resolveKey(lastPrimaryKey, lastSortKey)
        }

        const result: PaginatedResults<T> = {
            items: items,
            count: items.length,
        };

        if (queryResult.LastEvaluatedKey) {
            result.nextPageKey = Buffer.from(JSON.stringify(queryResult.LastEvaluatedKey)).toString("base64")
        }

        return result
    }

    async deleteItem(partitionKeyValue: string, sortKeyValue?: string) {
        const result = await this.docClient.delete({
            TableName: this.tableName,
            Key: this.resolveKey(partitionKeyValue, sortKeyValue),
        }).promise();
    }

    async updateItem(entity: T): Promise<T> {
        const key = this.resolveKey(entity[this.partitionKey], this.sortKey ? entity[this.sortKey] : undefined)
        const version: number = entity.version
        delete entity.version;
        delete entity[this.partitionKey];
        if (this.sortKey) delete entity[this.sortKey];

        let updateExpression = 'SET #version = :newVersion, ';
        let conditionExpression = '#version = :versionAtHand';
        const expressionAttributeNames: EntityStructure = {"#version": "version"};
        const expressionAttributeValues: EntityStructure = {":newVersion": Date.now(), ":versionAtHand": version};

        Object.entries(entity)
            .filter(([, value]) => typeof value !== 'undefined')
            .forEach(([key, value], index, array) => {
                updateExpression += `#${key} = :${key}`;
                expressionAttributeNames[`#${key}`] = key;
                expressionAttributeValues[`:${key}`] = value;

                if (index !== array.length - 1) {
                    updateExpression += ', ';
                }
            });

        await this.docClient.update({
            TableName: this.tableName,
            Key: key,
            UpdateExpression: updateExpression,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ConditionExpression: conditionExpression,
        }).promise();

        return entity;
    }

    private resolveKey = (partitionKeyValue: string, sortKeyValue?: string): { [key: string]: string } => {
        if (this.sortKey && sortKeyValue) return {
            [this.partitionKey]: partitionKeyValue,
            [this.sortKey]: sortKeyValue
        }
        else return {
            [this.partitionKey]: partitionKeyValue
        }
    }

    private resolveExpression = (partitionKeyValue: string, sortKeyValue?: string): string => {
        if (this.sortKey && sortKeyValue) return `${this.partitionKey} = ${partitionKeyValue} AND ${this.sortKey} = ${sortKeyValue}`
        else return `${this.partitionKey} = ${partitionKeyValue}`
    }
}

const EXHIBITION_TABLE_NAME = process.env.EXHIBITION_TABLE_NAME!!
const EXHIBITION_TABLE_PARTITION_KEY = "id"
const EXHIBITION_TABLE_SORT_KEY = "customerId"

const EXHIBITION_SNAPSHOT_TABLE_NAME = process.env.EXHIBITION_SNAPSHOT_TABLE_NAME!!
const EXHIBITION_SNAPSHOT_TABLE_PARTITION_KEY = "id"
const EXHIBITION_SNAPSHOT_TABLE_SORT_KEY = "lang"

export const exhibitionTable = new DynamoClient<Exhibition>(EXHIBITION_TABLE_NAME, EXHIBITION_TABLE_PARTITION_KEY, EXHIBITION_TABLE_SORT_KEY)
export const exhibitionSnapshotTable = new DynamoClient<ExhibitionSnapshot>(EXHIBITION_SNAPSHOT_TABLE_NAME, EXHIBITION_SNAPSHOT_TABLE_PARTITION_KEY, EXHIBITION_SNAPSHOT_TABLE_SORT_KEY)