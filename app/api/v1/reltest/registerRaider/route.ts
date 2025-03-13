// app/api/v1/auth/registerRaider/route.ts
import prisma from '@/app/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import transporter from '@/app/lib/mailer';
import { string, z } from 'zod';

enum StatusCodes {
  Success = 201,
  BadRequest = 400,
  InternalServerError = 500,
}

const dateIta = new Date();
dateIta.setHours(dateIta.getHours() + 1);


const registerSchema = z.object({
  email: z.string().email({ message: "Email non valida" }).max(30, { message: "L'email deve avere massimo 30 caratteri" }),
  password: z.string().min(6, { message: "La password deve avere almeno 6 caratteri" }).max(30, { message: "La password deve avere massimo 30 caratteri" }),
  name: z.string().min(2, { message: "Il nome deve avere almeno 2 caratteri" }).max(30, { message: "Il nome deve avere massimo 30 caratteri" }),
  surname: z.string().min(2, { message: "Il cognome deve avere almeno 2 caratteri" }).max(30, { message: "Il cognome deve avere massimo 30 caratteri" }), 
  vehicle: z.enum ([
    "CAR",
    "MOTORCYCLE",
    "BICYCLE",
    "VAN",
    "REFRIGERATEDVAN",
    "WITHOUTVEHICLE",
    "TRANSIT"
  ]).optional(),
});

const JWT_SECRET: string = process.env.JWT_SECRET!;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET non definito nelle variabili d'ambiente");
}

export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text();
    if (!bodyText || bodyText.trim() === "") {
      return NextResponse.json(
        { 
          requiredFields: { email: "example@example.com", password: "password123", name: "Mario" , surname: "Rossi" } 
        },
        { status: StatusCodes.BadRequest }
      );
    }

    const body = JSON.parse(bodyText);

    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      const errorMessage = validation.error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      return NextResponse.json(
        { message: errorMessage },
        { status: StatusCodes.BadRequest }
      );
    }
    
    const { email, password, name, surname, vehicle } = validation.data;    
    
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { message: "Utente già registrato" },
        { status: StatusCodes.BadRequest }
      );
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const confirmationToken = uuidv4();
    
    
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: "RAIDER",
        confirmed: false,
        confirmationToken,
        creatdeAt: dateIta,
      },
    });
    
    let profile = null;
    if (user.id != null) {
      profile = await prisma.raider.create({
        data: {
          name,
          surname,
          isActive: true,
          bussinesActived: [],
          inService: false,
          vehicle: "CAR",
          userId: user.id, 
        },
      });
    }
    
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
      { token, message: "Registrazione completata. Controlla la tua email per confermare l'account.", user, profile },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore durante la registrazione:", error);
    return NextResponse.json(
      { message: "Errore interno durante la registrazione" },
      { status: StatusCodes.InternalServerError }
    );
  }
}
