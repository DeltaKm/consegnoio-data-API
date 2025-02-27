// /app/auth/logout/route.ts
import prisma from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

enum StatusCodes {
  Success = 200,
  BadRequest = 400,
  Unauthorized = 401,
  InternalServerError = 500,
}

const JWT_SECRET: string = process.env.JWT_SECRET!;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET non definito nelle variabili d'ambiente");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;
    if (!token) {
      return NextResponse.json({ message: "Token mancante" }, { status: StatusCodes.BadRequest });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json({ message: "Token non valido" }, { status: StatusCodes.Unauthorized });
    }

    await prisma.user.update({
      where: { id: decoded.userId },
      data: { expired: true },
    });

    return NextResponse.json({ message: "Logout effettuato" }, { status: StatusCodes.Success });
  } catch (error) {
    console.error("Errore durante il logout:", error);
    return NextResponse.json(
      { message: "Errore interno durante il logout" },
      { status: StatusCodes.InternalServerError }
    );
  }
}
