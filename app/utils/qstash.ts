import "server-only";
import { Client } from "@upstash/qstash";

const g = globalThis as unknown as { __QSTASH_CLIENT__?: Client };

if (!g.__QSTASH_CLIENT__) {
  if (!process.env.QSTASH_TOKEN) {
    throw new Error("QSTASH_TOKEN is not set");
  }
  g.__QSTASH_CLIENT__ = new Client({ token: process.env.QSTASH_TOKEN });
}

export const qstash = g.__QSTASH_CLIENT__;
