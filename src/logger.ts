import winston from "winston";

const format = winston.format.printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label}] ${level}: ${message}`;
});

const logger = winston.createLogger({
  format,
  transports: [
    new winston.transports.File({ filename: 'injection-tool.log' }),
    new winston.transports.Console(),
  ],
});

export default logger;
