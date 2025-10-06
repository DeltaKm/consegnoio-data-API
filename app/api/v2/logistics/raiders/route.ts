import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireLogistics } from "@/app/lib/auth";
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
  businessId: z.string(), // ID del business a cui assegnare il raider (OBBLIGATORIO)
});

// GET - Lista tutti i raider
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
    const isActive = searchParams.get("isActive");

    // Prima ottieni i business gestiti dalla logistica
    const businessesManaged = await prisma.logisticsBusiness.findMany({
      where: { logisticsId: auth.logistics.id },
      select: { businessId: true }
    });

    const businessIds = businessesManaged.map(lb => lb.businessId);

    // Se la logistica non gestisce nessun business, ritorna lista vuota
    if (businessIds.length === 0) {
      return NextResponse.json(
        {
          raiders: [],
          pagination: {
            total: 0,
            limit,
            offset,
            hasMore: false
          }
        },
        { status: StatusCodes.Success }
      );
    }

    const where: any = {
      // Filtra solo raider associati ai business gestiti dalla logistica
      businessRelations: {
        some: {
          businessId: { in: businessIds }
        }
      }
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { surname: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    const [raiders, total] = await Promise.all([
      prisma.raider.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              confirmed: true,
            }
          },
          businessRelations: {
            where: {
              confirmedFromBusiness: true,
              businessId: { in: businessIds } // Mostra solo i business gestiti dalla logistica
            },
            include: {
              business: {
                select: {
                  id: true,
                  bussinesName: true,
                }
              }
            }
          }
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.raider.count({ where }),
    ]);

    const raidersWithStats = raiders.map(raider => ({
      id: raider.id,
      name: raider.name,
      surname: raider.surname,
      vehicle: raider.vehicle,
      isActive: raider.isActive,
      inService: raider.inService,
      email: raider.user?.email,
      confirmed: raider.user?.confirmed,
      businesses: raider.businessRelations.map(rel => ({
        id: rel.business.id,
        name: rel.business.bussinesName,
      })),
      totalBusinesses: raider.businessRelations.length,
      createdAt: raider.createdAt,
    }));

    return NextResponse.json(
      {
        raiders: raidersWithStats,
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
    console.error("Errore recupero raiders:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}

// POST - Crea nuovo raider della logistica
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
    
    // Validazione
    const validation = createRaiderSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: "Dati non validi", errors: validation.error.errors },
        { status: StatusCodes.BadRequest }
      );
    }

    const { email, password, name, surname, vehicle, mobile, businessId } = validation.data;

    // Verifica che la logistica gestisca il business specificato
    const businessesManaged = await prisma.logisticsBusiness.findMany({
      where: { logisticsId: auth.logistics.id },
      select: { businessId: true }
    });

    const businessIds = businessesManaged.map(lb => lb.businessId);

    if (!businessIds.includes(businessId)) {
      return NextResponse.json(
        { message: "Non hai i permessi per assegnare raider a questo business" },
        { status: StatusCodes.BadRequest }
      );
    }

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
          confirmed: true,
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
          createdByLogisticsId: auth.logistics.id,
          bussinesActived: [businessId],
        }
      });

      // 3. Crea relazione BusinessRaider
      const businessRaider = await tx.businessRaider.create({
        data: {
          businessId: businessId,
          raiderId: raider.id,
          confirmedFromBusiness: true,
        }
      });

      // 4. Aggiorna array raiderActived nel Business
      await tx.business.update({
        where: { id: businessId },
        data: {
          raiderActived: {
            push: raider.id
          }
        }
      });

      return { user, raider, businessRaider };
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
