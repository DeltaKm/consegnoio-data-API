// /app/auth/login/route.ts
import prisma from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

enum StatusCodes {
  NotFound = 404,
  Success = 200,
  BadRequest = 400,
  InternalServerError = 500,
}

const JWT_SECRET: string = process.env.JWT_SECRET!;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET non definito nelle variabili d'ambiente");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email e password sono obbligatorie" },
        { status: StatusCodes.BadRequest }
      );
    }

    // Usa il modello UserToImp per cercare l'utente
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { message: "Utente non trovato" },
        { status: StatusCodes.NotFound }
      );
    }

    const isValid = await bcrypt.compare(password, user.password!);
    if (!isValid) {
      return NextResponse.json(
        { message: "Credenziali non valide" },
        { status: StatusCodes.BadRequest }
      );
    }

    // Genera un nuovo token JWT valido per 1h
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "1h" });
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + 1);

    // Aggiorna il record utente con il token e la sua scadenza
    await prisma.user.update({
      where: { id: user.id },
      data: { tokenJWT: token, expirationJWT: expiration, expired: false },
    });

    return NextResponse.json({ token }, { status: StatusCodes.Success });
  } catch (error) {
    console.error("Errore durante il login:", error);
    return NextResponse.json(
      { message: "Errore interno durante il login" },
      { status: StatusCodes.InternalServerError }
    );
  }
}
