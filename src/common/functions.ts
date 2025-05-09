import { GetParameterCommand } from "@aws-sdk/client-ssm";
import { ssmClient } from "./aws-clients";

export const undefinedIfEmpty = <T>(array: T[]): T[] | undefined => {
    return array.length > 0 ? array : undefined
}

export async function getSecureStringParameter(parameterName: string): Promise<string> {
    const command = new GetParameterCommand({
        Name: parameterName,
        WithDecryption: true,
    });

    const response = await ssmClient.send(command);

    if (!response.Parameter || !response.Parameter.Value) {
        throw new Error(`Parameter ${parameterName} not found or has no value.`);
    }

    return response.Parameter.Value;
}