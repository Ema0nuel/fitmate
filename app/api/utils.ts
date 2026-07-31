/**
 * FitMate — API Route Utilities
 *
 * Shared helpers for Next.js API route handlers.
 */

import { NextResponse } from "next/server";
import { initDatabase } from "@/lib/db";

/**
 * Ensure database tables are created before handling requests.
 * Called once per cold start (initDatabase is idempotent via CREATE TABLE IF NOT EXISTS).
 */
let _initialized = false;

export function ensureDb(): void {
  if (!_initialized) {
    initDatabase();
    _initialized = true;
  }
}

/** Standard error response */
export function errorResponse(message: string, status: number = 400) {
  return NextResponse.json({ detail: message }, { status });
}

/** Standard 404 response */
export function notFound(message: string = "Not found") {
  return NextResponse.json({ detail: message }, { status: 404 });
}

/** Standard success response */
export function successResponse(data: unknown, status: number = 200) {
  return NextResponse.json(data, { status });
}

/** Standard 201 created response */
export function createdResponse(data: unknown) {
  return NextResponse.json(data, { status: 201 });
}

/** Parse JSON body from request, with error handling */
export async function parseBody<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    const body = await req.json();
    return body as T;
  } catch {
    throw new Error("Invalid JSON body");
  }
}

/** Extract search params from URL */
export function getSearchParam(url: string, key: string): string | null {
  const { searchParams } = new URL(url);
  return searchParams.get(key);
}
