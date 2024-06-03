import http from "http";
import {
  CloudWatchClient,
  PutMetricDataCommand,
  type PutMetricDataCommandInput,
} from "@aws-sdk/client-cloudwatch";

import { validate } from './validator'
import { type ValidationError } from "fastest-validator";

// Create a CloudWatch client
const cloudwatchClient = new CloudWatchClient();

const reportError = (
  res: http.ServerResponse,
  statusCode: number,
  message: string
) => {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: message }));
  console.warn(`Error: ${message}`);
};

const server = http.createServer((req, res) => {
  if (req.method !== "POST" || req.url !== "/metrics") {
    return reportError(res, 404, "Not found");
  }
  let body = "";

  req.on("data", (chunk: Buffer) => {
    body += chunk.toString();
  });

  req.on("end", async () => {
    try {
      const metrics = JSON.parse(body) as PutMetricDataCommandInput;
      const validationResponse = validate(metrics);
      if (validationResponse !== true) {
        const message = (validationResponse as ValidationError[]).map(m => m.message).join(', ');
        reportError(res, 400, `Validation Error: ${message}`);
        return;
      }

      console.debug('Sending command with data %j', metrics);
      const data = await cloudwatchClient.send(new PutMetricDataCommand(metrics));
      return res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(data));
    } catch (err) {
      reportError(res, 400, (err as Error).message);
    }
  });
});

const shutdown = async (signal: string) => {
  console.info(`Received ${signal}. Shutting down gracefully.`);
  server.close(() => {
    console.info('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

server.listen(process.env.PORT || 3000, () => {
  console.info("Server listening on port 3000");
});
