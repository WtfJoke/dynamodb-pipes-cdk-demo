# DynamoDB Pipes CDK Demo

Project for demonstrating how to use DynamoDB Streams in a EventBridge Pipe using CDK.

## Useful commands

* `pnpm run build`   compile typescript to js
* `pnpm run watch`   watch for changes and compile
* `pnpm run test`    perform the jest unit tests
* `pnpm run cdk deploy`  deploy this stack to your default AWS account/region
* `pnpm run cdk diff`    compare deployed stack with current state
* `pnpm run cdk synth`   emits the synthesized CloudFormation template

# Architecture

![Pipe - DynamoDB Stream to EventBridge EventBus Architecture](https://github.com/user-attachments/assets/0a5cfc82-7339-47e3-85af-e28d4e5bd025)