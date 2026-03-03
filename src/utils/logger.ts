import winston from "winston";

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true }),
    logFormat,
  ),
  transports: [
    new winston.transports.Console({
      format: combine(colorize(), logFormat),
      silent: process.env.NODE_ENV === "test",
    }),
  ],
});

export default logger;
