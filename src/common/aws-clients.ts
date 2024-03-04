import DynamoDB from "aws-sdk/clients/dynamodb";
import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import {PollyClient} from "@aws-sdk/client-polly";

export const dynamoClient = new DynamoDB.DocumentClient();

export  const sfnClient = new SFNClient({})

export const pollyClient = new PollyClient();