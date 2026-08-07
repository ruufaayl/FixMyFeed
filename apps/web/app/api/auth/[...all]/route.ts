/**
 * Better Auth API route (task T150).
 *
 * Forwards all `/api/auth/*` requests to the Better Auth handler. Runs on the
 * Node.js runtime (the auth integration uses the database client).
 */
import { auth } from "@/lib/server/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  return auth().handler(request);
}

export async function POST(request: Request): Promise<Response> {
  return auth().handler(request);
}
