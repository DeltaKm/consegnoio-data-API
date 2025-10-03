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
  name: z.string().min(2, { message: "Il nome deve avere almeno 2 caratteri" }),
  surname: z.string().min(2, { message: "Il cognome deve avere almeno 2 caratteri" }),
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
          message: "Campi mancanti",
          requiredFields: {
            email: "logistics@example.com",
            password: "password123",
            name: "Mario",
            surname: "Rossi"
          }
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

    const { email, password, name, surname } = validation.data;

    // Validazione dominio email - Blocca solo domini chiaramente fake
    const emailDomain = email.split('@')[1];
    const invalidDomains = [
      'test.com', 'fake.com', 'example.com', 'example.org', 'example.net',
      'localhost', '127.0.0.1', 'temp.com', 'temporary.com', 'disposable.com',
      '10minutemail.com', 'guerrillamail.com', 'mailinator.com'
    ];
    
    // Verifica che il dominio abbia almeno un punto e non sia nella blacklist
    if (!emailDomain || !emailDomain.includes('.') || invalidDomains.includes(emailDomain)) {
      return NextResponse.json(
        {
          message: "Email non valida",
          error: `Dominio '${emailDomain}' non valido. Evita domini temporanei o fake.`
        },
        { status: StatusCodes.BadRequest }
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { message: "Utente già registrato con questa email" },
        { status: StatusCodes.BadRequest }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const confirmationToken = uuidv4();

    // Prima testa l'invio email SENZA salvare nel DB
    const baseUrl = process.env.BASE_URL || "http://localhost:3000";
    const confirmationLink = `${baseUrl}/api/v1/auth/confirm?token=${confirmationToken}`;

    // Test invio email PRIMA di salvare nel DB
    try {
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: email,
        subject: "Conferma la tua email - Consegnoio Logistics",
        html: `
          <h2>Benvenuto su Consegnoio!</h2>
          <p>Il tuo account Logistics è stato creato.</p>
          <p>Clicca sul seguente link per confermare la tua email:</p>
          <a href="${confirmationLink}">${confirmationLink}</a>
        `,
      });
      console.log('✅ Email di conferma inviata a:', email);
    } catch (emailError) {
      console.error('❌ Errore invio email:', emailError);
      return NextResponse.json(
        {
          message: "Errore invio email",
          error: "Impossibile inviare email di conferma. Verifica che l'indirizzo sia corretto.",
          details: emailError instanceof Error ? emailError.message : "Errore sconosciuto"
        },
        { status: StatusCodes.BadRequest }
      );
    }

    // Se l'email è stata inviata con successo, ALLORA salva nel DB
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: "LOGISTICS",
        confirmed: false,
        confirmationToken,
      },
    });

    const logistics = await prisma.logistics.create({
      data: {
        name,
        surname,
        userId: user.id,
      },
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "24h" });
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + 24);

    await prisma.user.update({
      where: { id: user.id },
      data: { tokenJWT: token, expirationJWT: expiration, expired: false },
    });

    return NextResponse.json(
      {
        token,
        message: "Registrazione completata. Controlla la tua email per confermare l'account.",
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        logistics: {
          id: logistics.id,
          name: logistics.name,
          surname: logistics.surname,
        }
      },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore durante la registrazione Logistics:", error);
    return NextResponse.json(
      { message: "Errore interno durante la registrazione" },
      { status: StatusCodes.InternalServerError }
    );
  }
}
