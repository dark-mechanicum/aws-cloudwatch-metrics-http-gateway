import { metricsBuffer } from './metrics';
import { default as logsParent } from './logger';
import { default as server } from './server';

const logger = logsParent.child({ module: 'main' });

/**
 * Graceful shutdown of the application
 * @param signal Signal received
 */
const shutdown = async (signal: string) => {
  logger.info({ signal }, 'Shutting down gracefully');
  server.close(async () => {
    logger.info('HTTP server closed');

    // Flush data to AWS and stop intervals
    await metricsBuffer.destroy();

    process.exit(0);
  });
};

// Handle application stop signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start listening on the specified port
const port = process.env.PORT || 3000;
server.listen(port, () => {
  logger.info({ port }, 'Server listening');
});
