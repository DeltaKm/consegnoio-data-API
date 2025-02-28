import prisma from '@/app/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';

enum StatusCodes {
  Success = 200,
  BadRequest = 400,
  NotFound = 404,
  InternalServerError = 500,
}

export async function POST(request: NextRequest) {
  try {
    console.log("Reset Password: Inizio");
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    console.log("Token ricevuto:", token);
    if (!token) {
      console.error("Token mancante");
      return NextResponse.json(
        { message: "Token mancante" },
        { status: StatusCodes.BadRequest }
      );
    }

    const body = await request.json();
    console.log("Dati ricevuti:", body);
    const { newPassword } = body;
    if (!newPassword) {
      console.error("Nuova password mancante");
      return NextResponse.json(
        { message: "La nuova password è obbligatoria" },
        { status: StatusCodes.BadRequest }
      );
    }

    console.log("Cerco l'utente con reset token:", token);
    const user = await prisma.user.findFirst({
      where: { resetPasswordToken: token },
    });
    console.log("Utente trovato:", user);
    if (!user) {
      console.error("Token non valido");
      return NextResponse.json(
        { message: "Token non valido" },
        { status: StatusCodes.NotFound }
      );
    }

    if (user.resetPasswordExpiration && new Date() > user.resetPasswordExpiration) {
      console.error("Token scaduto");
      return NextResponse.json(
        { message: "Il token di reset è scaduto" },
        { status: StatusCodes.BadRequest }
      );
    }

    console.log("Hash della nuova password in corso...");
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log("Nuova password hashata:", hashedPassword);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpiration: null,
      },
    });
    console.log("Utente aggiornato con nuova password:", updatedUser);

    return NextResponse.json(
      { message: "Password resettata con successo" },
      { status: StatusCodes.Success }
    );
  } catch (error) {
    console.error("Errore durante il reset della password:", error);
    return NextResponse.json(
      { message: "Errore interno durante il reset della password" },
      { status: StatusCodes.InternalServerError }
    );
  }
}
