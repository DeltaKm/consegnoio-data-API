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
    
    console.log("V2 Confirm route - token ricevuto:", token);
    
    if (!token) {
      return NextResponse.json(
        { message: "Token mancante" }, 
        { status: StatusCodes.BadRequest }
      );
    }

    // Cerca l'utente con il token di conferma
    const user = await prisma.user.findFirst({ 
      where: { confirmationToken: token } 
    });
    
    console.log("Utente trovato:", user ? `${user.email} (ID: ${user.id})` : "Nessuno");

    if (!user) {
      return NextResponse.json(
        { message: "Token non valido o scaduto" }, 
        { status: StatusCodes.NotFound }
      );
    }

    if (user.confirmed) {
      return NextResponse.json(
        { message: "Email già confermata" }, 
        { status: StatusCodes.Success }
      );
    }

    // Aggiorna l'utente per confermare l'email e rimuovere il token
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        confirmed: true, 
        confirmationToken: null 
      },
    });

    console.log(`✅ Email confermata per utente: ${user.email}`);

    return NextResponse.json(
      { 
        message: "Email confermata con successo! Ora puoi fare il login.",
        user: {
          email: user.email,
          role: user.role
        }
      }, 
      { status: StatusCodes.Success }
    );
  } catch (error) {
    console.error("Errore durante la conferma dell'email:", error);
    return NextResponse.json(
      { message: "Errore interno del server" }, 
      { status: StatusCodes.InternalServerError }
    );
  }
}
