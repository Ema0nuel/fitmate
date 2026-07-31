/**
 * GET /api/health — Health check endpoint
 */

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "FitMate API",
    version: "1.0.0",
  });
}
