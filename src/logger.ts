import { pino } from 'pino';

const logger = pino({
  // Set the logging level based on the DEBUG environment variable
  // If DEBUG is set, log at the 'debug' level; otherwise, log at the 'info' level
  level: process.env.DEBUG ? 'debug' : 'info',

  // Limit the depth of objects that are logged to prevent excessive output
  depthLimit: 5,

  // Specify the key in the log object where the actual log message should be stored
  messageKey: 'message',

  // Disable timestamp generation for each log entry
  timestamp: false,

  // Do not add a base object to the logged data (useful when integrating with other systems)
  base: undefined,

  // Custom formatters allow us to manipulate the log output; here, we define one for the log level
  formatters: {
    // This formatter takes the log level label and returns an object with a 'level' property containing the label
    level(label) {
      return { level: label };
    },
  },
});

export default logger;
