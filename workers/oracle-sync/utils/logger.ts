import { createLogger, format, transports } from 'winston';
import { config } from '../config';

export const logger = createLogger({
  level: config.log.level,
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.json(),
  ),
  transports: [
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    }),
    new transports.File({ filename: config.log.file }),
  ],
});
