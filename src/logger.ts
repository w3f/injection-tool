import winston from "winston";

const format = winston.format.printf(({ level, message }) => {
  return `${level}: ${message}`;
});

const logger = winston.createLogger({
  format,
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'hash.log', level: 'info' }),
    new winston.transports.File({ filename: 'injection-tool.log', level: 'debug' }),
    new winston.transports.Console(),
  ],
});

export default logger;
