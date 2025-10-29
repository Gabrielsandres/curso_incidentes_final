type LogLevel = "debug" | "info" | "warn" | "error";

const levelOrder: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const envLevel = (process.env.LOG_LEVEL ?? "info").toLowerCase() as LogLevel;
const activeLevel: LogLevel = envLevel in levelOrder ? envLevel : "info";

function shouldLog(level: LogLevel) {
  return levelOrder[level] >= levelOrder[activeLevel];
}

function formatMessage(level: LogLevel, messages: unknown[]) {
  const timestamp = new Date().toISOString();
  return [`[${timestamp}]`, level.toUpperCase(), ...messages];
}

export const logger = {
  debug: (...messages: unknown[]) => {
    if (shouldLog("debug")) {
      console.debug(...formatMessage("debug", messages));
    }
  },
  info: (...messages: unknown[]) => {
    if (shouldLog("info")) {
      console.info(...formatMessage("info", messages));
    }
  },
  warn: (...messages: unknown[]) => {
    if (shouldLog("warn")) {
      console.warn(...formatMessage("warn", messages));
    }
  },
  error: (...messages: unknown[]) => {
    if (shouldLog("error")) {
      console.error(...formatMessage("error", messages));
    }
  },
};
