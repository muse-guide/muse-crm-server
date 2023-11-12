export type EntityStructure = { [key: string]: any; }

export class Table {
    name: string;
    partitionKey: string
    sortKey?: string

    constructor(tableName: string, partitionKey: string, sortKey: string) {
        this.name = tableName;
        this.partitionKey = partitionKey;
        this.sortKey = sortKey;
    }

    resolveKey = (partitionKeyValue: string, sortKeyValue?: string): { [key: string]: string } => {
        if (this.sortKey && sortKeyValue) return {
            [this.partitionKey]: partitionKeyValue,
            [this.sortKey]: sortKeyValue
        }
        else return {
            [this.partitionKey]: partitionKeyValue
        }
    }
}

export interface KeysInput {
    partitionKey: string
    sortKey?: string
}

export class TxInput {
    Put?: {
        TableName: string,
        Item: EntityStructure
    }
    Delete?: {
        TableName: string,
        Key: EntityStructure
    }
    Update?: {
        TableName: string,
        Key: EntityStructure,
        UpdateExpression: string,
        ExpressionAttributeNames: EntityStructure,
        ExpressionAttributeValues: EntityStructure
    }

    static putOf = (table: Table, ...items: EntityStructure[]): TxInput[] => {
        return items.map(item => {
            return {
                Put: {
                    TableName: table.name,
                    Item: item
                }
            }
        })
    }

    static deleteOf = (table: Table, ...keys: KeysInput[]): TxInput[] => {
        return keys.map(key => {
            return {
                Delete: {
                    TableName: table.name,
                    Key: table.resolveKey(key.partitionKey, key.sortKey)
                }
            }
        })
    }

    static updateOf = (table: Table, ...items: EntityStructure[]): TxInput[] => {
        return items.map(item => {
            const key = table.resolveKey(item[table.partitionKey], table.sortKey ? item[table.sortKey] : undefined)
            const expressionAttributeNames: EntityStructure = {};
            const expressionAttributeValues: EntityStructure = {};
            let updateExpression = 'SET ';

            Object.entries(item)
                .filter(([, value]) => typeof value !== 'undefined')
                .forEach(([key, value], index, array) => {
                    updateExpression += `#${key} = :${key}`;
                    expressionAttributeNames[`#${key}`] = key;
                    expressionAttributeValues[`:${key}`] = value;

                    if (index !== array.length - 1) {
                        updateExpression += ', ';
                    }
                });

            return {
                Update: {
                    TableName: table.name,
                    Key: key,
                    UpdateExpression: updateExpression,
                    ExpressionAttributeNames: expressionAttributeNames,
                    ExpressionAttributeValues: expressionAttributeValues
                }
            }
        })
    }
}

const EXHIBITION_TABLE_NAME = process.env.EXHIBITION_TABLE_NAME!!
const EXHIBITION_TABLE_PARTITION_KEY = "id"
const EXHIBITION_TABLE_SORT_KEY = "customerId"
export const EXHIBITION_TABLE = new Table(EXHIBITION_TABLE_NAME, EXHIBITION_TABLE_PARTITION_KEY, EXHIBITION_TABLE_SORT_KEY)

const EXHIBITION_SNAPSHOT_TABLE_NAME = process.env.EXHIBITION_SNAPSHOT_TABLE_NAME!!
const EXHIBITION_SNAPSHOT_TABLE_PARTITION_KEY = "id"
const EXHIBITION_SNAPSHOT_TABLE_SORT_KEY = "lang"
export const EXHIBITION_SNAPSHOT_TABLE = new Table(EXHIBITION_SNAPSHOT_TABLE_NAME, EXHIBITION_SNAPSHOT_TABLE_PARTITION_KEY, EXHIBITION_SNAPSHOT_TABLE_SORT_KEY)
