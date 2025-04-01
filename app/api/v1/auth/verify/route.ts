import { NextRequest, NextResponse } from "next/server";
import { authenticateToken } from "@/app/lib/auth";

enum StatusCodes {
  Success = 200,
  Unauthorized = 401,
  InternalServerError = 500,
}

export async function GET(request: NextRequest) {
  try {
    const decoded = await authenticateToken(request);

    if (!decoded) {
      return NextResponse.json(
        { message: "Token non valido o scaduto" },
        { status: StatusCodes.Unauthorized }
      );
    }

    return NextResponse.json(
      { valid: true, userId: decoded.userId },
      { status: StatusCodes.Success }
    );
  } catch (error) {
    console.error("Errore nel verify:", error);
    return NextResponse.json(
      { message: "Errore interno" },
      { status: StatusCodes.InternalServerError }
    );
  }
}
