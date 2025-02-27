// /app/protected/validate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { authenticateToken } from "@/app/lib/auth";

export async function GET(request: NextRequest) {
  const decoded = await authenticateToken(request);
  if (!decoded) {
    return NextResponse.json({ message: "Token non valido" }, { status: 401 });
  }
  return NextResponse.json({ message: "Token valido" });
}
