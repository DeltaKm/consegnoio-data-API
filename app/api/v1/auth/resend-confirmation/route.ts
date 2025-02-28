// app/api/v1/auth/resend-confirmation/route.ts
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
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { message: "Email è obbligatoria" },
        { status: StatusCodes.BadRequest }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { message: "Utente non trovato" },
        { status: StatusCodes.NotFound }
      );
    }

    if (user.confirmed) {
      return NextResponse.json(
        { message: "L'utente è già confermato" },
        { status: StatusCodes.BadRequest }
      );
    }

    const newToken = uuidv4();
    console.log("Nuovo token generato per il reinvio:", newToken);

    await prisma.user.update({
      where: { id: user.id },
      data: { confirmationToken: newToken },
    });

    const baseUrl = process.env.BASE_URL || "http://localhost:3000";
    const confirmationLink = `${baseUrl}/api/v1/auth/confirm?token=${newToken}`;
    console.log("Link di conferma da inviare:", confirmationLink);

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: "Reinvio conferma email",
      text: `Clicca sul seguente link per confermare la tua email: ${confirmationLink}`,
      html: `<p>Clicca sul seguente link per confermare la tua email:</p><a href="${confirmationLink}">${confirmationLink}</a>`,
    };

    await transporter.sendMail(mailOptions);
    console.log("Email di conferma reinviata a:", email);

    return NextResponse.json(
      { message: "Link di conferma inviato con successo" },
      { status: StatusCodes.Success }
    );
  } catch (error) {
    console.error("Errore durante il reinvio del link di conferma:", error);
    return NextResponse.json(
      { message: "Errore interno" },
      { status: StatusCodes.InternalServerError }
    );
  }
}
