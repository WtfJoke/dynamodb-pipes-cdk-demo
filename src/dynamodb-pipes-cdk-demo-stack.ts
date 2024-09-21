import { RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { AttributeType, BillingMode, StreamViewType, Table } from "aws-cdk-lib/aws-dynamodb";
import { EventBus, Rule } from "aws-cdk-lib/aws-events";
import { CloudWatchLogGroup } from "aws-cdk-lib/aws-events-targets";
import { Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Runtime, Tracing } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { CfnPipe } from "aws-cdk-lib/aws-pipes";
import type { Construct } from "constructs";
import { resolve } from "node:path";

export class DynamodbPipesCdkDemoStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const removalPolicy = RemovalPolicy.DESTROY
    const sourceTable = new Table(this, "Table", {
      partitionKey: {
        name: "PK",
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy,
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
      timeToLiveAttribute: "ttl",
    })
    if (!sourceTable.tableStreamArn) {
      throw new Error("Table stream ARN is not available")
    }
    const unmarshallFunctionLogs = new LogGroup(this, "StreamUnmarshallerLogGroup", { removalPolicy, retention: RetentionDays.ONE_MONTH })
    const unmarshallFunction = new NodejsFunction(this, "StreamUnmarshaller", {
      entry: resolve("src", "stream-unmarshaller.ts"),
      runtime: Runtime.NODEJS_LATEST,
      tracing: Tracing.ACTIVE,
      logGroup: unmarshallFunctionLogs,
    })

    const targetEventBus = new EventBus(this, "Bus", {})
    const logAllEventsLogGroup = new LogGroup(this, "LogAllEventsLogGroup", { removalPolicy, retention: RetentionDays.ONE_MONTH })
    const eventSource = "DynamoDB"
    new Rule(this, "LogAllEventsRule", {
      eventBus: targetEventBus,
      eventPattern: {
        source: [eventSource],
      },
      targets: [new CloudWatchLogGroup(logAllEventsLogGroup)],
      description: "Rule to demonstrate logging all events from DynamoDB to CloudWatch Logs",
    })

    const pipeLogs = new LogGroup(this, "PipeLogGroup", { removalPolicy, retention: RetentionDays.ONE_MONTH })
    const pipeRole = new Role(this, "PipeRole", {
      assumedBy: new ServicePrincipal("pipes.amazonaws.com"),
    })
    sourceTable.grantStreamRead(pipeRole)
    targetEventBus.grantPutEventsTo(pipeRole)
    pipeLogs.grantWrite(pipeRole)
    unmarshallFunction.grantInvoke(pipeRole)



    new CfnPipe(this, "DynamoDbEventBusPipe", {
      roleArn: pipeRole.roleArn,
      source: sourceTable.tableStreamArn,
      target: targetEventBus.eventBusArn,

      description: 'Pipe to demonstrate putting all non-removal DynamoDB events (e.g. MODIFY/INSERT) to an EventBridge event bus',
      enrichment: unmarshallFunction.functionArn,
      logConfiguration: {
        cloudwatchLogsLogDestination: {
          logGroupArn: pipeLogs.logGroupArn,
        },
        includeExecutionData: ["ALL"],
        level: 'INFO',
      },

      sourceParameters: {
        dynamoDbStreamParameters: {
          startingPosition: 'LATEST',
        },
        filterCriteria: {
          filters: [{
            pattern: JSON.stringify({
              "eventName": ["MODIFY", "INSERT"]
            }),
          }],
        },

      },
      targetParameters: {
        eventBridgeEventBusParameters: {
          detailType: 'StreamEvent',
          source: eventSource,
        },

        inputTemplate: JSON.stringify({
          "PK": "<$.dynamodb.Keys.PK.S>",
          "Name": "<$.dynamodb.NewImage.name>",
          "Age": "<$.dynamodb.NewImage.age>",
          "Email": "<$.dynamodb.NewImage.email>",
        }),

      },
    });
  }
}
