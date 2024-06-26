import { type PutMetricDataCommandInput } from "@aws-sdk/client-cloudwatch";
import { type ValidationError } from "fastest-validator";
import http from "http";
import { metricsBuffer } from "./metrics";
import { validate } from './validator';

/**
 * Prepare HTTP Error response to the
 * @param res Response object to prepare error response
 * @param statusCode HTTP Response code should be sent in response
 * @param message Description message about error
 */
const reportError = (
  res: http.ServerResponse,
  statusCode: number,
  message: string
) => {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: message }));
  console.warn(`Error Response: ${message}`);
};

/**
 * Actually creating and managing a server
 */
const server = http.createServer((req, res) => {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');

  // allowing GET /healthcheck requests to verify that application are alive
  if (req.method === "GET" && req.url == "/healthcheck") {
    return res.writeHead(200).end();
  }

  // allowing POST /metrics requests to receive metrics
  if (req.method !== "POST" && req.url !== "/metrics") {
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

      metricsBuffer.add(metrics);

      return res.writeHead(202).end();
    } catch (err) {
      reportError(res, 400, (err as Error).message);
    }
  });
});

/**
 * Graceful shutting down of application
 * @param signal Description of signal was received
 */
const shutdown = async (signal: string) => {
  console.info(`Received ${signal}. Shutting down gracefully.`);
  server.close(async () => {
    console.info('HTTP server closed.');

    // Flushing data to AWS and stopping intervals
    await metricsBuffer.destroy();

    process.exit(0);
  });
};

// reaction to the stop application
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// start listening port and receive applications
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.info(`Server listening on port ${port}`);
});
