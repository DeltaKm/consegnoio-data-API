// app/api/v1/auth/login/route.ts
import prisma from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Asserzione non nulla per JWT_SECRET
const JWT_SECRET: string = process.env.JWT_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email e password sono obbligatorie" },
        { status: 400 }
      );
    }

    // Trova l'utente in base all'email
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { message: "Utente non trovato" },
        { status: 401 }
      );
    }

    // Confronta la password fornita con quella salvata (hashata)
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { message: "Credenziali non valide" },
        { status: 401 }
      );
    }

    // Genera il token JWT SENZA scadenza (non impostiamo expiresIn)
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "1h" });

    return NextResponse.json({ token }, { status: 200 });
  } catch (error) {
    console.error("Errore durante il login:", error);
    return NextResponse.json(
      { message: "Errore interno del server" },
      { status: 500 }
    );
  }
}
