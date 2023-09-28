import {NotFoundException} from "../common/exceptions";
import {Exhibition} from "../model/exhibition.model";
import * as DynamoDB from 'aws-sdk/clients/dynamodb';
import {ExhibitionSnapshot} from "../model/exhibition-snapshot.model";

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

    private resolveKey = (partitionKeyValue: string, sortKeyValue?: string): { [key: string]: string } => {
        if (this.sortKey && sortKeyValue) return {
            [this.partitionKey]: partitionKeyValue,
            [this.sortKey]: sortKeyValue
        }
        else return {
            [this.partitionKey]: partitionKeyValue
        }
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

    async deleteItem(partitionKeyValue: string, sortKeyValue?: string): Promise<T> {
        const result = await this.docClient.delete({
            TableName: this.tableName,
            Key: this.resolveKey(partitionKeyValue, sortKeyValue),
            ReturnValues: 'ALL_OLD'
        }).promise();

        if (result.Attributes == undefined) {
            throw new NotFoundException(`Item with id: ${partitionKeyValue} not found for in table: ${this.tableName}`)
        }
        return result.Attributes as T;
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