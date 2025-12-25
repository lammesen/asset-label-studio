import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function handleHealth(_req: Request): Promise<Response> {
  try {
    await db.execute(sql`SELECT 1`);

    return Response.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? "0.1.0",
    });
  } catch (error) {
    console.error("Health check failed:", error);
    return Response.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: "Database connection failed",
      },
      { status: 503 }
    );
  }
}

export function handleReadiness(_req: Request): Response {
  return Response.json({
    status: "ready",
    timestamp: new Date().toISOString(),
  });
}
