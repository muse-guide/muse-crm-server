import {handleError} from "./common/response-formatter";
import middy from "@middy/core";
import httpJsonBodyParser from '@middy/http-json-body-parser'
import {required} from "./schema/validation";
import {logger} from "./common/logger";
import {CreateInvalidationCommand} from "@aws-sdk/client-cloudfront";
import {cdnClient} from "./common/aws-clients";

const distirbutionId = required.parse(process.env.APP_DISTRIBUTION_ID)

export interface InvalidationInput {
    paths: string[],
}

const cdnManager = async (invalidation: InvalidationInput) => {
    try {
        logger.info(`Creating invalidation for: ${JSON.stringify(invalidation)}`)
        const input = {
            DistributionId: distirbutionId,
            InvalidationBatch: {
                Paths: {
                    Quantity: invalidation.paths.length,
                    Items: invalidation.paths,
                },
                CallerReference: `Invalidation-${Date.now()}`,
            },
        };
        const command = new CreateInvalidationCommand(input);
        const response = await cdnClient.send(command);

        logger.debug(`Invalidation for distribution: ${distirbutionId} created for paths: ${invalidation.paths} with id: ${response?.Invalidation?.Id}`);
    } catch (err) {
        return handleError(err);
    }
};

export const handler = middy(cdnManager);
handler
    .use(httpJsonBodyParser({
        disableContentTypeError: true
    }))