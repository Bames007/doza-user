// app/lib/apiHelpers.ts

import { NextResponse } from "next/server";
import { z } from "zod";
import logger from "@/app/utils/logger";

/**
 * Standard 401 Unauthorized response
 */
export function unauthorized() {
  return NextResponse.json(
    { success: false, error: "Unauthorized" },
    { status: 401 },
  );
}

/**
 * Standard 429 Too Many Requests response
 */
export function tooManyRequests() {
  return NextResponse.json(
    { success: false, error: "Too many requests" },
    { status: 429 },
  );
}

/**
 * Centralized error handler for API routes.
 * Handles Zod validation errors, logs using logger, and returns a consistent JSON error.
 */
export function handleError(error: unknown): NextResponse {
  // Zod validation errors
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: "Validation failed",
        details: error.issues,
      },
      { status: 400 },
    );
  }

  // All other errors
  const msg = error instanceof Error ? error.message : String(error);
  logger.error(error, "API error:");
  return NextResponse.json({ success: false, error: msg }, { status: 500 });
}

/**
 * Computes stock status based on quantity, reorder point, and expiry date.
 * Used by inventory adjustment and fulfillment endpoints.
 */
export function computeStatus(
  quantity: number,
  reorderPoint: number,
  expiryDate?: string,
): string {
  if (expiryDate && new Date(expiryDate) < new Date()) return "expired";
  if (quantity === 0) return "out-of-stock";
  if (quantity <= reorderPoint) return "low-stock";
  return "in-stock";
}
