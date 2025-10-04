import winston from 'winston';
import { ringBufferTransport } from './ringBufferTransport.js';

const isProd = process.env.NODE_ENV === 'production';
const logLevel = process.env.LOG_LEVEL || 'info';

// Create the main logger
export const logger = winston.createLogger({
    level: logLevel,
    format: isProd
        ? winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json()
        )
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({ format: 'HH:mm:ss' }),
            winston.format.errors({ stack: true }),
            winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
                let log = `${timestamp} ${level}: ${message}`;
                if (stack) log += `\n${stack}`;
                if (Object.keys(meta).length > 0) {
                    log += ` ${JSON.stringify(meta, null, 2)}`;
                }
                return log;
            })
        ),
    transports: [
        new winston.transports.Console({
            stderrLevels: ['error']
        }),
        ringBufferTransport
    ],
    exitOnError: false
});

// Add file transport if enabled
if (process.env.LOG_TO_FILE === 'true') {
    const logFile = process.env.LOG_FILE || '/app/logs/app.log';
    logger.add(new winston.transports.File({
        filename: logFile,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json()
        )
    }));
}

// Handle uncaught exceptions and unhandled rejections
logger.exceptions.handle(
    new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp(),
            winston.format.printf(({ level, message, timestamp, stack }) => {
                return `${timestamp} ${level}: ${message}${stack ? `\n${stack}` : ''}`;
            })
        )
    })
);

logger.rejections.handle(
    new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp(),
            winston.format.printf(({ level, message, timestamp, stack }) => {
                return `${timestamp} ${level}: ${message}${stack ? `\n${stack}` : ''}`;
            })
        )
    })
);

export default logger;
