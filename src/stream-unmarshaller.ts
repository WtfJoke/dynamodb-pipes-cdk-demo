import type { AttributeValue } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import type { DynamoDBRecord } from "aws-lambda";

export const handler = async (
    event: DynamoDBRecord[],
): Promise<DynamoDBRecord[]> => {
    console.log("Received event:", JSON.stringify(event, null, 2));
    const processedRecords: DynamoDBRecord[] = event.map((record) => {
        const dynamodb = record.dynamodb;

        const NewImage = dynamodb?.NewImage
            ? unmarshall(dynamodb.NewImage as Record<string, AttributeValue>) // casting here because its the same type from different packages (aws-lambda vs @aws-sdk/client-dynamodb)
            : undefined;

        const OldImage = dynamodb?.OldImage
            ? unmarshall(dynamodb.OldImage as Record<string, AttributeValue>) // casting here because its the same type from different packages (aws-lambda vs @aws-sdk/client-dynamodb)
            : undefined;

        return {
            ...record,
            dynamodb: {
                ...record.dynamodb,
                NewImage,
                OldImage,
            },
        };
    });
    console.log(JSON.stringify(processedRecords, null, 2));
    return processedRecords;
};
