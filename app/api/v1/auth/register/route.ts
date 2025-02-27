// /app/auth/register/route.ts
import prisma from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

enum StatusCodes {
  Success = 201,
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

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { message: "Utente già registrato" },
        { status: StatusCodes.BadRequest }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, role: "USER" },
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "1h" });
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + 1);

    await prisma.user.update({
      where: { id: user.id },
      data: { tokenJWT: token, expirationJWT: expiration, expired: false },
    });

    return NextResponse.json({ token }, { status: StatusCodes.Success });
  } catch (error) {
    console.error("Errore durante la registrazione:", error);
    return NextResponse.json(
      { message: "Errore interno durante la registrazione" },
      { status: StatusCodes.InternalServerError }
    );
  }
}
