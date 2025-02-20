import prisma from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

enum StatusCodes {
  NotFound = 404,
  Success = 200,
  Created = 201,
  BadRequest = 400,
  InternalServerError = 500,
}

// Asserzione non nulla per JWT_SECRET
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

    // Controlla se l'utente esiste già
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { message: "Utente già registrato" },
        { status: StatusCodes.BadRequest }
      );
    }

    // Cripta la password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crea l'utente
    const user = await prisma.user.create({
      data: { email, password: hashedPassword },
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "1h" });
   

    return NextResponse.json({status: "Success", hashedPassword: hashedPassword, token }, { status: StatusCodes.Created });
  } catch (error) {
    console.error("Errore durante la registrazione:", error);
    return NextResponse.json(
      { message: "Errore interno durante la registrazione" },
      { status: StatusCodes.InternalServerError }
    );
  }
}

