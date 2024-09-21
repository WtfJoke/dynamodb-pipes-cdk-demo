import { unmarshall } from "@aws-sdk/util-dynamodb";
import type {
    DynamoDBRecord,
} from "aws-lambda";

export const handler = async (event: DynamoDBRecord[]): Promise<DynamoDBRecord[]> => {
    console.log("Received event:", JSON.stringify(event, null, 2));
    const processedRecords: DynamoDBRecord[] = event.map(record => {
        // @ts-ignore - its the same type from different packages (aws-lambda vs @aws-sdk/client-dynamodb)
        const NewImage = record.dynamodb?.NewImage ? unmarshall(record.dynamodb?.NewImage) : undefined;
        // @ts-ignore - its the same type from different packages (aws-lambda vs @aws-sdk/client-dynamodb)
        const OldImage = record.dynamodb?.OldImage ? unmarshall(record.dynamodb?.OldImage) : undefined;

        return {
            ...record,
            dynamodb: {
                ...record.dynamodb,
                NewImage,
                OldImage
            },
        };
    });
    console.log(JSON.stringify(processedRecords, null, 2));
    return processedRecords;
}