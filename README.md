# CloudWatch Metrics Reporter

This Node.js application sets up an HTTP server that listens for POST requests containing AWS CloudWatch metric data and sends the data to AWS CloudWatch API.

## How It Works

The server listens on the `/metrics` endpoint for POST requests. When it receives a request, it parses the body as JSON and expects it to conform to the `PutMetricDataCommandInput` format required by AWS CloudWatch. If the request is valid, it sends the metric data to CloudWatch using the AWS SDK.

## Supported Environment Variables

* `PORT` [default: 3000] - Port a server will listen
* `METRICS_FLUSH_INTERVAL` [default: 60000] - How often flush metrics to the AWS CLoudWatch API in Milliseconds

## Required AWS Permissions

To allow the execution of the application that interacts with AWS CloudWatch, the following policy permissions should be defined:

- `cloudwatch:PutMetricData`: Allows the application to publish metric data points to Amazon CloudWatch.

Here is an example of an IAM policy that grants the necessary permissions:

```json
{ "Version": "2012-10-17", "Statement": [ { "Effect": "Allow", "Action": [ "cloudwatch:PutMetricData" ], "Resource": "*" } ] }
```

Ensure that you attach this policy to the IAM role or user that is used to execute the application.

## Sending Metric Data

To send metric data to the server, make a POST request to `http://localhost:3000/metrics` with a JSON payload conforming to the `PutMetricDataCommandInput` format.

Example payload:
```json { "Namespace": "MyApp", "MetricData": [ { "MetricName": "Requests", "Dimensions": [ { "Name": "ServiceName", "Value": "UserService" } ], "Timestamp": "2023-01-01T12:00:00Z", "Value": 1, "Unit": "Count" } ] }```

## Graceful Shutdown

The server can be stopped gracefully by sending a `SIGTERM` or `SIGINT` signal. This will allow the server to finish processing any ongoing requests before shutting down.

## Running the Server Locally

- Node.js installed on your local machine.
- AWS credentials configured locally, which the AWS SDK can use to authenticate with AWS CloudWatch.
- Created `.env` file in the project root directory with defined environment variables will be passed to the Docker image

1. Clone the repository to your local machine.
2. Navigate to the directory where you cloned the repository.
3. Install the required dependencies by running `npm install`.
4. Start the server by running `npm dev`

The server will start listening on port 3000 by default, or on the port specified by the `PORT` environment variable if it is set.

## Local Docker Development

Create `.env` file with `AWS_REGION`, `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` values to allow run that code in the docker container.

## Notes

- Ensure that your AWS credentials have the necessary permissions to put metric data to CloudWatch.
- The server logs errors and debug information to the console.
