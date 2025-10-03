import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireLogistics } from "@/app/lib/auth";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from 'uuid';
import transporter from '@/app/lib/mailer';
import jwt from "jsonwebtoken";
import { z } from "zod";

enum StatusCodes {
  Success = 200,
  Created = 201,
  BadRequest = 400,
  Unauthorized = 401,
  InternalServerError = 500,
}

const JWT_SECRET: string = process.env.JWT_SECRET!;

const createBusinessSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  bussinesName: z.string().min(2),
  address: z.string().min(2),
  businessCord: z.string().optional(),
});

// GET - Lista business assegnati al logistics
export async function GET(request: NextRequest) {
  const auth = await requireLogistics(request);
  if (!auth) {
    return NextResponse.json(
      { message: "Non autorizzato. Accesso riservato a Logistics." },
      { status: StatusCodes.Unauthorized }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const search = searchParams.get("search");

    // Ottieni IDs dei business assegnati a questo logistics
    const assignedBusinessIds = auth.logistics.businessRelations.map(rel => rel.businessId);

    const where: any = {
      id: { in: assignedBusinessIds } // ← FILTRA SOLO BUSINESS ASSEGNATI
    };

    if (search) {
      where.AND = [
        { id: { in: assignedBusinessIds } },
        {
          OR: [
            { bussinesName: { contains: search, mode: 'insensitive' } },
            { address: { contains: search, mode: 'insensitive' } },
          ]
        }
      ];
    }

    const [businesses, total] = await Promise.all([
      prisma.business.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              confirmed: true,
              creatdeAt: true,
            }
          },
          raiderRelations: {
            where: {
              confirmedFromBusiness: true,
            },
            select: {
              raiderId: true,
            }
          },
          deliveries: {
            select: {
              status: true,
            }
          }
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.business.count({ where }),
    ]);

    const businessesWithStats = businesses.map(business => {
      const activeRaiders = business.raiderRelations.length;
      const totalOrders = business.deliveries.length;
      const completedOrders = business.deliveries.filter(d => d.status === "COMPLETED").length;

      return {
        id: business.id,
        name: business.bussinesName,
        address: business.address,
        coordinates: business.businessCord,
        email: business.user?.email,
        confirmed: business.user?.confirmed,
        activeRaiders,
        stats: {
          totalOrders,
          completedOrders,
        },
        createdAt: business.createdAt,
      };
    });

    return NextResponse.json(
      {
        businesses: businessesWithStats,
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
    console.error("Errore recupero businesses:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}

// POST - Crea nuovo business
export async function POST(request: NextRequest) {
  const auth = await requireLogistics(request);
  if (!auth) {
    return NextResponse.json(
      { message: "Non autorizzato. Accesso riservato a Logistics." },
      { status: StatusCodes.Unauthorized }
    );
  }

  try {
    const body = await request.json();
    const validation = createBusinessSchema.safeParse(body);

    if (!validation.success) {
      const errorMessage = validation.error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      return NextResponse.json(
        { message: errorMessage },
        { status: StatusCodes.BadRequest }
      );
    }

    const { email, password, bussinesName, address, businessCord } = validation.data;

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

    const baseUrl = process.env.BASE_URL || "http://localhost:3000";
    const confirmationLink = `${baseUrl}/api/v1/auth/confirm?token=${confirmationToken}`;

    try {
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: email,
        subject: "Conferma la tua email - Consegnoio Business",
        html: `
          <h2>Benvenuto su Consegnoio!</h2>
          <p>Il tuo account Business è stato creato.</p>
          <p>Clicca sul seguente link per confermare la tua email:</p>
          <a href="${confirmationLink}">${confirmationLink}</a>
        `,
      });
    } catch (mailError) {
      console.error("Errore invio email:", mailError);
    }

    return NextResponse.json(
      {
        message: "Business creato con successo",
        business: {
          id: business.id,
          name: business.bussinesName,
          address: business.address,
          email: user.email,
        }
      },
      { status: StatusCodes.Created }
    );
  } catch (error: any) {
    console.error("Errore creazione business:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
