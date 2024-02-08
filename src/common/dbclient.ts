import DynamoDB from "aws-sdk/clients/dynamodb";

export const client = new DynamoDB.DocumentClient();
