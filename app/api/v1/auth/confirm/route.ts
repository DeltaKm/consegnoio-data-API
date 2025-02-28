// app/api/v1/auth/confirm/route.ts
import prisma from '@/app/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

enum StatusCodes {
  Success = 200,
  BadRequest = 400,
  NotFound = 404,
  InternalServerError = 500,
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    console.log("Confirm route - token ricevuto:", token);
    if (!token) {
      return NextResponse.json({ message: "Token mancante" }, { status: StatusCodes.BadRequest });
    }

    // Cerca l'utente con il token di conferma
    const user = await prisma.user.findFirst({ where: { confirmationToken: token } });
    console.log("Utente trovato:", user);

    if (!user) {
      return NextResponse.json({ message: "Token non valido" }, { status: StatusCodes.NotFound });
    }

    // Aggiorna l'utente per confermare l'email e rimuovere il token
    await prisma.user.update({
      where: { id: user.id },
      data: { confirmed: true, confirmationToken: null },
    });

    return NextResponse.json({ message: "Email confermata con successo" }, { status: StatusCodes.Success });
  } catch (error) {
    console.error("Errore durante la conferma dell'email:", error);
    return NextResponse.json({ message: "Errore interno" }, { status: StatusCodes.InternalServerError });
  }
}
