import { createLogger, format, transports } from 'winston';

const NODE_ENV = process.env.NODE_ENV ?? 'development';

export const logger = createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.json(),
  ),
  transports: [
    new transports.Console({
      format: NODE_ENV === 'development'
        ? format.combine(format.colorize(), format.simple())
        : format.json(),
    }),
    new transports.File({ filename: process.env.LOG_FILE ?? 'logs/api.log' }),
  ],
});
