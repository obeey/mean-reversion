import { createLogger, format, transports, Logger, level } from "winston";

const { combine, timestamp, printf } = format;

// 自定义日志格式
const myFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level}: ${message}`;
});

// 创建 Logger 实例
const logger: Logger = createLogger({
  level: "info",
  format: combine(
    format.timestamp({ format: "MMM-DD-YYYY HH:mm:ss" }),
    myFormat
  ),
  // defaultMeta: { service: 'user-service' }, // 如果需要可以取消注释
  transports: [
    // - Write all logs with importance level of `error` or less to `error.log`
    // - Write all logs with importance level of `info` or less to `combined.log`
    new transports.File({ filename: "error.log", level: "error" }),
    new transports.File({ filename: "combined.log" }),
    new transports.Console({ level: "debug" }),
  ],
});

// 导出 logger
export default logger;
