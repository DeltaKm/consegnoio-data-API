// app/api/v1/auth/register/route.ts
import prisma from '@/app/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import transporter from '@/app/lib/mailer';
import { z } from 'zod';

enum StatusCodes {
  Success = 201,
  BadRequest = 400,
  InternalServerError = 500,
}

const registerSchema = z.object({
  email: z.string().email({ message: "Email non valida" }),
  password: z.string().min(6, { message: "La password deve avere almeno 6 caratteri" }),
});

const JWT_SECRET: string = process.env.JWT_SECRET!;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET non definito nelle variabili d'ambiente");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Valida i dati con Zod
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      // Raccogli i messaggi d'errore
      const errorMessage = validation.error.errors.map(err => err.message).join(', ');
      return NextResponse.json(
        { message: errorMessage },
        { status: StatusCodes.BadRequest }
      );
    }
    
    const { email, password } = validation.data;
    
    // Controlla se l'utente esiste già
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { message: "Utente già registrato" },
        { status: StatusCodes.BadRequest }
      );
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    // Genera un token di conferma
    const confirmationToken = uuidv4();
    
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: "RAIDER", // oppure usa il default se preferisci
        confirmed: false,
        confirmationToken,
      },
    });
    
    // Genera il link di conferma
    const baseUrl = process.env.BASE_URL || "http://localhost:3000";
    const confirmationLink = `${baseUrl}/api/v1/auth/confirm?token=${confirmationToken}`;
    
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: "Conferma la tua email",
      text: `Clicca sul seguente link per confermare la tua email: ${confirmationLink}`,
      html: `<p>Clicca sul seguente link per confermare la tua email:</p><a href="${confirmationLink}">${confirmationLink}</a>`,
    };
    
    await transporter.sendMail(mailOptions);
    
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "1h" });
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + 1);
    
    await prisma.user.update({
      where: { id: user.id },
      data: { tokenJWT: token, expirationJWT: expiration, expired: false },
    });
    
    return NextResponse.json(
      { token, message: "Registrazione completata. Controlla la tua email per confermare l'account." },
      { status: StatusCodes.Success }
    );
  } catch (error) {
    console.error("Errore durante la registrazione:", error);
    return NextResponse.json(
      { message: "Errore interno durante la registrazione" },
      { status: StatusCodes.InternalServerError }
    );
  }
}
