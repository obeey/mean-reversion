import { createLogger, format, transports, Logger, level } from "winston";

const { combine, timestamp, printf } = format;

function getCurrentFormattedDate(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0"); // 月份从0开始
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

// 自定义日志格式
const myFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level}: ${message}`;
});

const formattedDate = getCurrentFormattedDate();

// 创建 Logger 实例
const logger: Logger = createLogger({
  level: "debug",
  format: combine(format.timestamp({ format: "YYYYMMDD-HHmmss" }), myFormat),
  // defaultMeta: { service: 'user-service' }, // 如果需要可以取消注释
  transports: [
    // - Write all logs with importance level of `error` or less to `error.log`
    // - Write all logs with importance level of `info` or less to `combined.log`
    new transports.File({
      filename: `log/error_${formattedDate}.log`,
      level: "error",
    }),
    new transports.File({ filename: `log/combined_${formattedDate}.log` }),
    new transports.Console({ level: "debug" }),
  ],
});

// 导出 logger
export default logger;
