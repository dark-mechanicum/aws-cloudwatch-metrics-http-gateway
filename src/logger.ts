import { pino } from 'pino';

const logger = pino({
  level: process.env.DEBUG ? 'debug' : 'info',
  depthLimit: 5,
  messageKey: 'message',
  timestamp: false,
  base: undefined,
  formatters: {
    level(label) {
      return { level: label };
    },
  },
});

export default logger;
