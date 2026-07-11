// lib/logger.ts
import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

// In production, you might want to send logs to Vercel’s stdout (default)
// and also to an external service via a transport.
const logger = pino({
  level: isProduction ? "info" : "debug",
  // Vercel’s environment handles JSON logs well, you can keep them as JSON.
  // If you want readable logs locally, use pino-pretty in dev:
  transport: !isProduction
    ? {
        target: "pino-pretty",
        options: { colorize: true },
      }
    : undefined,
  // Redact sensitive fields globally (e.g., emails, tokens)
  redact: ["req.headers.authorization", "email", "phone"],
});

export default logger;
