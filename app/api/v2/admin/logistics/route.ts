import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import transporter from "@/app/lib/mailer";
import { z } from "zod";

enum StatusCodes {
  Success = 200,
  Created = 201,
  BadRequest = 400,
  Unauthorized = 401,
  InternalServerError = 500,
}

const createLogisticsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  surname: z.string().min(2),
});

// GET - Lista tutti i logistics
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth) {
    return NextResponse.json(
      { message: "Non autorizzato. Accesso riservato agli Admin." },
      { status: StatusCodes.Unauthorized }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const [logisticsList, total] = await Promise.all([
      prisma.logistics.findMany({
        include: {
          user: {
            select: {
              id: true,
              email: true,
              confirmed: true,
              expired: true,
            }
          },
          businessRelations: {
            include: {
              business: {
                select: {
                  id: true,
                  bussinesName: true,
                  address: true,
                }
              }
            }
          }
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.logistics.count(),
    ]);

    const logisticsWithStats = logisticsList.map(log => ({
      id: log.id,
      name: log.name,
      surname: log.surname,
      email: log.user?.email,
      confirmed: log.user?.confirmed,
      expired: log.user?.expired,
      assignedBusinesses: log.businessRelations.map(rel => ({
        id: rel.business.id,
        name: rel.business.bussinesName,
        address: rel.business.address,
      })),
      totalBusinesses: log.businessRelations.length,
      createdAt: log.createdAt,
    }));

    return NextResponse.json(
      {
        logistics: logisticsWithStats,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        }
      },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore recupero logistics:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}

// POST - Crea nuovo account Logistics (Admin, senza passare per l'auto-registrazione)
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth) {
    return NextResponse.json(
      { message: "Non autorizzato. Accesso riservato agli Admin." },
      { status: StatusCodes.Unauthorized }
    );
  }

  try {
    const body = await request.json();
    const validation = createLogisticsSchema.safeParse(body);

    if (!validation.success) {
      const errorMessage = validation.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return NextResponse.json(
        { message: errorMessage },
        { status: StatusCodes.BadRequest }
      );
    }

    const { email, password, name, surname } = validation.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { message: "Email già registrata" },
        { status: StatusCodes.BadRequest }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const confirmationToken = uuidv4();

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

    const baseUrl = process.env.BASE_URL || "http://localhost:3000";
    const confirmationLink = `${baseUrl}/api/v2/auth/confirm?token=${confirmationToken}`;

    try {
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: email,
        subject: "Conferma la tua email - ItalyDelivery Logistics",
        html: `
          <h2>Benvenuto su ItalyDelivery!</h2>
          <p>Il tuo account Logistics è stato creato dall'Admin.</p>
          <p>Clicca sul seguente link per confermare la tua email:</p>
          <a href="${confirmationLink}">${confirmationLink}</a>
        `,
      });
    } catch (mailError) {
      console.error("Errore invio email:", mailError);
    }

    return NextResponse.json(
      {
        message: "Account Logistics creato con successo",
        logistics: {
          id: logistics.id,
          name: logistics.name,
          surname: logistics.surname,
          email: user.email,
        },
      },
      { status: StatusCodes.Created }
    );
  } catch (error: any) {
    console.error("Errore creazione logistics:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
