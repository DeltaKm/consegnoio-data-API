import prisma from '@/app/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import transporter from '@/app/lib/mailer';
import { z } from 'zod';

enum StatusCodes {
  Success = 201,
  Created = 201,
  BadRequest = 400,
  InternalServerError = 500,
}

const registerSchema = z.object({
  email: z.string().email({ message: "Email non valida" }).max(60, { message: "L'email deve avere massimo 60 caratteri" }),
  password: z.string().min(6, { message: "La password deve avere almeno 6 caratteri" }).max(30, { message: "La password deve avere massimo 30 caratteri" }),
  bussinesName: z.string().min(2, { message: "Il nome del business deve avere almeno 2 caratteri" }).max(60, { message: "Il nome deve avere massimo 60 caratteri" }),
  address: z.string().min(2, { message: "L'indirizzo deve avere almeno 2 caratteri" }).max(90, { message: "L'indirizzo deve avere massimo 90 caratteri" }),
  businessCord: z.string().optional(),
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
            email: "example@example.com",
            password: "password123",
            bussinesName: "Nome Attività",
            address: "Via Example 123, 00100 Roma",
            businessCord: "41.9028,12.4964"
          }
        },
        { status: StatusCodes.BadRequest }
      );
    }

    const body = JSON.parse(bodyText);
    const validation = registerSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        {
          message: "Errore di validazione",
          errors: validation.error?.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })) || [],
        },
        { status: StatusCodes.BadRequest }
      );
    }

    const { email, password, bussinesName, address, businessCord } = validation.data!;

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
    const confirmationLink = `${baseUrl}/api/v2/auth/confirm?token=${confirmationToken}`;

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: "Conferma la tua email - Consegnoio Business",
      text: `Clicca sul seguente link per confermare la tua email: ${confirmationLink}`,
      html: `
        <h2>Benvenuto su Consegnoio!</h2>
        <p>Grazie per esserti registrato come Business.</p>
        <p>Clicca sul seguente link per confermare la tua email:</p>
        <a href="${confirmationLink}">${confirmationLink}</a>
      `,
    };

    // Test invio email PRIMA di salvare nel DB
    try {
      await transporter.sendMail(mailOptions);
      console.log('✅ Email di conferma inviata a:', email);
    } catch (emailError) {
      console.error(' Errore invio email:', emailError);
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
        role: "BUSINESS",
        confirmed: false,
        confirmationToken,
      },
    });

    const business = await prisma.business.create({
      data: {
        bussinesName,
        raiderActived: [],
        address,
        businessCord: businessCord || "",
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
        business: {
          id: business.id,
          name: business.bussinesName,
          address: business.address,
        }
      },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore durante la registrazione Business:", error);
    return NextResponse.json(
      { message: "Errore interno durante la registrazione" },
      { status: StatusCodes.InternalServerError }
    );
  }
}
