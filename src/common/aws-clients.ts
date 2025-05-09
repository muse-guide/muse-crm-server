import DynamoDB from "aws-sdk/clients/dynamodb";
import {SFNClient} from "@aws-sdk/client-sfn";
import {PollyClient} from "@aws-sdk/client-polly";
import {S3Client} from "@aws-sdk/client-s3";
import {CloudFrontClient} from "@aws-sdk/client-cloudfront";
import {SSMClient} from "@aws-sdk/client-ssm";

export const dynamoClient = new DynamoDB.DocumentClient();

export const s3Client = new S3Client({});

export const sfnClient = new SFNClient({})

export const pollyClient = new PollyClient();

export const cdnClient = new CloudFrontClient({});

export const ssmClient = new SSMClient({});
