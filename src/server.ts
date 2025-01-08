import { type PutMetricDataCommandInput } from '@aws-sdk/client-cloudwatch';
import { type ValidationError } from 'fastest-validator';
import http from 'http';
import { metricsBuffer } from './metrics';
import { validate } from './validator';
import { default as logsParent } from './logger';

const logger = logsParent.child({ module: 'server' });

/**
 * Prepare HTTP Error response
 * @param res Response object to prepare error response
 * @param statusCode HTTP Response code to be sent in response
 * @param message Description message about the error
 */
const reportError = (res: http.ServerResponse, statusCode: number, message: string) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: message }));
};

/**
 * Parse the request body
 * @param req Incoming HTTP request
 * @returns Promise resolving to the request body string
 */
const parseRequestBody = (req: http.IncomingMessage): Promise<string> => {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      resolve(body);
    });

    req.on('error', err => {
      console.error({ error: err }, "Can't parse request body");
      reject(err);
    });
  });
};

/**
 * Process an array of metrics
 * @param metrics Array of PutMetricDataCommandInput objects
 * @returns Promise resolving to an object indicating success or errors
 */
const processMetrics = async (
  metrics: PutMetricDataCommandInput[],
): Promise<{
  success: boolean;
  errors?: { index: number; errors: ValidationError[] }[];
}> => {
  const errors: { index: number; errors: ValidationError[] }[] = [];

  for (let i = 0; i < metrics.length; i++) {
    const metric = metrics[i];
    const validationResponse = validate(metric);
    if (validationResponse !== true) {
      errors.push({
        index: i,
        errors: validationResponse as ValidationError[],
      });
    } else {
      metricsBuffer.add(metric);
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true };
};

/**
 * Handle POST requests to /metrics endpoint
 * @param req Incoming HTTP request
 * @param res HTTP response object
 */
const handleMetrics = async (req: http.IncomingMessage, res: http.ServerResponse) => {
  try {
    const body = await parseRequestBody(req);
    const metric = JSON.parse(body) as PutMetricDataCommandInput;
    const result = await processMetrics([metric]);
    if (result.success) {
      res.writeHead(202).end();
    } else {
      const errorMessages = result.errors!.map(
        e => `Metric at index ${e.index}: ` + e.errors.map(err => err.message).join(', '),
      );
      reportError(res, 400, `Validation Errors: ${errorMessages.join('; ')}`);
    }
  } catch (err) {
    reportError(res, 400, (err as Error).message);
  }
};

/**
 * Handle POST requests to /batch endpoint
 * @param req Incoming HTTP request
 * @param res HTTP response object
 */
const handleBatch = async (req: http.IncomingMessage, res: http.ServerResponse) => {
  try {
    const body = await parseRequestBody(req);
    const metricsArray = JSON.parse(body) as PutMetricDataCommandInput[];
    if (!Array.isArray(metricsArray)) {
      reportError(res, 400, 'Expected an array of metrics');
      return;
    }

    const result = await processMetrics(metricsArray);
    if (result.success) {
      res.writeHead(202).end();
    } else {
      const errorMessages = result.errors!.map(
        e => `Metric at index ${e.index}: ` + e.errors.map(err => err.message).join(', '),
      );
      reportError(res, 400, `Validation Errors: ${errorMessages.join('; ')}`);
    }
  } catch (err) {
    reportError(res, 400, (err as Error).message);
  }
};

/**
 * Handle OPTIONS requests to any endpoint
 * @param req Incoming HTTP request
 * @param res HTTP response object
 */
const handleOptions = async (req: http.IncomingMessage, res: http.ServerResponse) => {
  res.writeHead(204).end();
};

/**
 * Handle GET requests to /healthcheck endpoint
 * @param req Incoming HTTP request
 * @param res HTTP response object
 */
const handleHealthCheck = async (req: http.IncomingMessage, res: http.ServerResponse) => {
  res.writeHead(200).end();
};

// Define the type for the router object
type RouteHandlers = {
  [key: string]: {
    [method: string]: (req: http.IncomingMessage, res: http.ServerResponse) => Promise<void>;
  };
};

/**
 * Create and manage the HTTP server
 */
const server = http.createServer((req, res) => {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Custom-User-Agent');

  const router: RouteHandlers = {
    '/healthcheck': {
      OPTIONS: handleOptions,
      GET: handleHealthCheck,
    },
    '/metrics': {
      OPTIONS: handleOptions,
      POST: handleMetrics,
    },
    '/batch': {
      OPTIONS: handleOptions,
      POST: handleBatch,
    },
  };

  const path = req.url || '/';
  const method = req.method || 'GET';

  // Route handling
  if (router[path] && router[path][method]) {
    router[path][method](req, res).catch(err => {
      logger.error({ err }, 'Error handling request');
      reportError(res, 500, 'Internal Server Error');
    });
  } else {
    const { url, method } = req;
    logger.warn({ url, method }, 'Invalid request URL or method');
    reportError(res, 404, 'Not Found');
  }
});

export default server;
