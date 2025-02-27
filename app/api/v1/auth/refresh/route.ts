// /app/auth/refresh/route.ts
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

    // Decodifica il token ignorando la scadenza per ottenere l'userId
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
    } catch (e) {
      return NextResponse.json({ message: "Token non valido" }, { status: StatusCodes.Unauthorized });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      return NextResponse.json({ message: "Utente non trovato" }, { status: StatusCodes.BadRequest });
    }

    const now = new Date();
    if (user.tokenJWT !== token || (user.expirationJWT && now > user.expirationJWT) || user.expired) {
      return NextResponse.json({ message: "Token non valido o scaduto" }, { status: StatusCodes.Unauthorized });
    }

    // Genera un nuovo token valido per 1h
    const newToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "1h" });
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + 1);

    await prisma.user.update({
      where: { id: user.id },
      data: { tokenJWT: newToken, expirationJWT: expiration, expired: false },
    });

    return NextResponse.json({ token: newToken }, { status: StatusCodes.Success });
  } catch (error) {
    console.error("Errore durante il refresh del token:", error);
    return NextResponse.json(
      { message: "Errore interno durante il refresh del token" },
      { status: StatusCodes.InternalServerError }
    );
  }
}
