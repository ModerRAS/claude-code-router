import fs from "node:fs";
import path from "node:path";
import { HOME_DIR } from "../constants";
import { initializeGlobalLogIntegration } from "./logging/integration/integration-factory";

const LOG_FILE = path.join(HOME_DIR, "claude-code-router.log");

// Ensure log directory exists
if (!fs.existsSync(HOME_DIR)) {
  fs.mkdirSync(HOME_DIR, { recursive: true });
}

// 初始化增强日志系统（异步，不影响现有功能）
let enhancedLoggerReady = false;
initializeGlobalLogIntegration({
  enableNewLogging: process.env.ENABLE_ENHANCED_LOGGING !== "false",
  logDirectory: HOME_DIR,
  logLevel: process.env.LOG_LEVEL || "info",
})
  .then(() => {
    enhancedLoggerReady = true;
  })
  .catch((error) => {
    console.warn("Failed to initialize enhanced logging system:", error.message);
  });

export function log(...args: any[]) {
  // Check if logging is enabled via environment variable
  const isLogEnabled = process.env.LOG === "true";

  if (!isLogEnabled) {
    return;
  }

  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${
    Array.isArray(args)
      ? args
          .map((arg) =>
            typeof arg === "object" ? JSON.stringify(arg) : String(arg)
          )
          .join(" ")
      : ""
  }\n`;

  // Append to log file (保持现有行为)
  fs.appendFileSync(LOG_FILE, logMessage, "utf8");

  // 同时使用增强日志系统（如果已准备好）
  if (enhancedLoggerReady) {
    try {
      // 这里可以调用增强日志系统，但为了保持兼容性，暂时不改变现有行为
      // 后续可以通过环境变量控制是否启用增强功能
    } catch (error) {
      // 静默处理增强日志系统的错误
    }
  }
}

/**
 * 增强日志函数（可选使用）
 */
export async function enhancedLog(...args: any[]) {
  try {
    if (!enhancedLoggerReady) {
      // 如果增强日志系统未准备好，使用传统日志
      return log(...args);
    }

    const { log: enhancedLogFunc } = await import("./logging/integration/integration-factory");
    await enhancedLogFunc(...args);
  } catch (error) {
    // 回退到传统日志
    log(...args);
  }
}

/**
 * 获取请求日志器（用于追踪特定请求）
 */
export async function getRequestLogger(requestId: string) {
  try {
    if (!enhancedLoggerReady) {
      // 返回一个模拟的请求日志器
      return {
        log: (...args: any[]) => log(`[${requestId}]`, ...args),
        error: (...args: any[]) => log(`[${requestId}] ERROR:`, ...args),
        warn: (...args: any[]) => log(`[${requestId}] WARN:`, ...args),
        debug: (...args: any[]) => log(`[${requestId}] DEBUG:`, ...args),
      };
    }

    const { getRequestLogger } = await import("./logging/integration/integration-factory");
    return await getRequestLogger(requestId);
  } catch (error) {
    // 回退到模拟的请求日志器
    return {
      log: (...args: any[]) => log(`[${requestId}]`, ...args),
      error: (...args: any[]) => log(`[${requestId}] ERROR:`, ...args),
      warn: (...args: any[]) => log(`[${requestId}] WARN:`, ...args),
      debug: (...args: any[]) => log(`[${requestId}] DEBUG:`, ...args),
    };
  }
}
