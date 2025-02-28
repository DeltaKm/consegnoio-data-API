import prisma from '@/app/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import transporter from '@/app/lib/mailer';

enum StatusCodes {
  Success = 200,
  BadRequest = 400,
  NotFound = 404,
  InternalServerError = 500,
}

export async function POST(request: NextRequest) {
  try {
    console.log("Reset Password Request: Inizio");
    const body = await request.json();
    console.log("Dati ricevuti:", body);
    const { email } = body;

    if (!email) {
      console.error("Email mancante nel body");
      return NextResponse.json(
        { message: "L'email è obbligatoria" },
        { status: StatusCodes.BadRequest }
      );
    }

    console.log("Cerco l'utente con email:", email);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.error("Utente non trovato per email:", email);
      return NextResponse.json(
        { message: "Utente non trovato" },
        { status: StatusCodes.NotFound }
      );
    }
    console.log("Utente trovato:", user);

    // Genera il token di reset e imposta la scadenza (es. 1 ora)
    const resetToken = uuidv4();
    console.log("Token di reset generato:", resetToken);
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + 1);
    console.log("Scadenza token:", expiration);

    // Aggiorna l'utente con il token di reset e la sua scadenza
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordToken: resetToken, resetPasswordExpiration: expiration },
    });
    console.log("Utente aggiornato con token reset:", updatedUser);

    // Genera il link di reset usando BASE_URL (impostata nelle variabili d'ambiente)
    const baseUrl = process.env.BASE_URL || "http://localhost:3000";
    const resetLink = `${baseUrl}/api/v1/auth/reset?token=${resetToken}`;
    console.log("Link di reset generato:", resetLink);

    // Configura l'email di reset
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: "Reset della password",
      text: `Clicca sul seguente link per resettare la tua password: ${resetLink}`,
      html: `<p>Clicca sul seguente link per resettare la tua password:</p><a href="${resetLink}">${resetLink}</a>`,
    };

    console.log("Invio email di reset...");
    await transporter.sendMail(mailOptions);
    console.log("Email di reset inviata con successo a:", email);

    return NextResponse.json(
      { message: "Link per il reset della password inviato con successo" },
      { status: StatusCodes.Success }
    );
  } catch (error) {
    console.error("Errore durante la richiesta di reset della password:", error);
    return NextResponse.json(
      { message: "Errore interno durante la richiesta di reset" },
      { status: StatusCodes.InternalServerError }
    );
  }
}
