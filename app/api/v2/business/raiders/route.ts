import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireBusiness } from "@/app/lib/auth";
import bcrypt from "bcrypt";
import { z } from "zod";

enum StatusCodes {
  Success = 200,
  Created = 201,
  BadRequest = 400,
  Unauthorized = 401,
  Conflict = 409,
  InternalServerError = 500,
}

const createRaiderSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  surname: z.string().min(1),
  vehicle: z.enum(["CAR", "BICYCLE", "MOTORCYCLE", "VAN", "REFRIGERATEDVAN", "WITHOUTVEHICLE", "TRANSIT"]),
  mobile: z.string().optional(),
});

// GET - Lista raider del business
export async function GET(request: NextRequest) {
  const auth = await requireBusiness(request);
  if (!auth) {
    return NextResponse.json(
      { message: "Non autorizzato. Accesso riservato ai Business." },
      { status: StatusCodes.Unauthorized }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status"); // "confirmed", "pending", "all"
    const name = searchParams.get("name");
    const raiderId = searchParams.get("raiderId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    let where: any = {
      businessId: auth.business.id,
    };

    if (status === "confirmed") {
      where.confirmedFromBusiness = true;
    } else if (status === "pending") {
      where.confirmedFromBusiness = false;
    }

    // Filtro per raiderId specifico
    if (raiderId) {
      where.raiderId = raiderId;
    }

    // Filtro per data creazione
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    // Filtro per nome/cognome
    if (name) {
      where.raider = {
        OR: [
          { name: { contains: name, mode: 'insensitive' } },
          { surname: { contains: name, mode: 'insensitive' } },
        ]
      };
    }

    const relations = await prisma.businessRaider.findMany({
      where,
      include: {
        raider: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                imgUrl: true,
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const raiders = relations.map(rel => ({
      id: rel.raider.id,
      relationId: rel.id,
      name: rel.raider.name,
      surname: rel.raider.surname,
      vehicle: rel.raider.vehicle,
      isActive: rel.raider.isActive,
      inService: rel.raider.inService,
      confirmedFromBusiness: rel.confirmedFromBusiness,
      email: rel.raider.user?.email,
      imgUrl: rel.raider.user?.imgUrl,
      createdAt: rel.createdAt,
    }));

    return NextResponse.json(
      { raiders },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore recupero raiders:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}

// POST - Crea nuovo raider per il business
export async function POST(request: NextRequest) {
  const auth = await requireBusiness(request);
  if (!auth) {
    return NextResponse.json(
      { message: "Non autorizzato. Accesso riservato ai Business." },
      { status: StatusCodes.Unauthorized }
    );
  }

  try {
    const body = await request.json();
    
    // Validazione
    const validation = createRaiderSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: "Dati non validi", errors: validation.error.errors },
        { status: StatusCodes.BadRequest }
      );
    }

    const { email, password, name, surname, vehicle, mobile } = validation.data;

    // Verifica email non già usata
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Email già registrata" },
        { status: StatusCodes.Conflict }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crea user, raider e relazione in transazione
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crea User
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          role: "RAIDER",
          confirmed: true, // Business crea raider già confermato
          expired: false,
        }
      });

      // 2. Crea Raider
      const raider = await tx.raider.create({
        data: {
          userId: user.id,
          name,
          surname,
          vehicle,
          mobile,
          isActive: true,
          createdByBusinessId: auth.business.id, // ← Traccia chi l'ha creato
          bussinesActived: [auth.business.id],
        }
      });

      // 3. Crea relazione BusinessRaider
      const relation = await tx.businessRaider.create({
        data: {
          businessId: auth.business.id,
          raiderId: raider.id,
          confirmedFromBusiness: true, // Già confermato
        }
      });

      // 4. Aggiorna array raiderActived nel Business
      await tx.business.update({
        where: { id: auth.business.id },
        data: {
          raiderActived: {
            push: raider.id
          }
        }
      });

      return { user, raider, relation };
    });

    return NextResponse.json(
      {
        message: "Raider creato con successo",
        raider: {
          id: result.raider.id,
          name: result.raider.name,
          surname: result.raider.surname,
          vehicle: result.raider.vehicle,
          mobile: result.raider.mobile,
          email: result.user.email,
        }
      },
      { status: StatusCodes.Created }
    );
  } catch (error: any) {
    console.error("Errore creazione raider:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
