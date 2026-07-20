import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";
import bcrypt from "bcrypt";
import { z } from "zod";

enum StatusCodes {
  Success = 200,
  Created = 201,
  BadRequest = 400,
  Unauthorized = 401,
  Conflict = 409,
  NotFound = 404,
  InternalServerError = 500,
}

const createRaiderSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  surname: z.string().min(1),
  vehicle: z.enum(["CAR", "BICYCLE", "MOTORCYCLE", "VAN", "REFRIGERATEDVAN", "WITHOUTVEHICLE", "TRANSIT"]),
  mobile: z.string().optional(),
  assignToBusinessIds: z.array(z.string()).optional(),
  assignToLogisticsId: z.string().optional(),
});

// GET - Lista tutti i raider (Admin vede tutto)
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
    const name = searchParams.get("name");
    const isActive = searchParams.get("isActive");
    const raiderId = searchParams.get("raiderId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const where: any = {};

    // Filtro per ID raider specifico
    if (raiderId) {
      where.id = raiderId;
    }

    // Filtro per nome/cognome
    if (name) {
      where.OR = [
        { name: { contains: name, mode: 'insensitive' } },
        { surname: { contains: name, mode: 'insensitive' } },
      ];
    }

    // Filtro per stato attivo
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === "true";
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

    const [raiders, total] = await Promise.all([
      prisma.raider.findMany({
        where,
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
            where: { confirmedFromBusiness: true },
            include: {
              business: {
                select: {
                  id: true,
                  bussinesName: true,
                }
              }
            }
          },
          assignedDeliveries: {
            select: {
              deliveryId: true,
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
      expired: raider.user?.expired,
      businesses: raider.businessRelations.map(rel => ({
        id: rel.business.id,
        name: rel.business.bussinesName,
      })),
      totalBusinesses: raider.businessRelations.length,
      currentAssignments: raider.assignedDeliveries.length,
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

// POST - Crea nuovo raider (Admin può creare per chiunque)
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
    
    // Validazione
    const validation = createRaiderSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: "Dati non validi", errors: validation.error.errors },
        { status: StatusCodes.BadRequest }
      );
    }

    const { email, password, name, surname, vehicle, mobile, assignToBusinessIds, assignToLogisticsId } = validation.data;

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

    // Verifica che tutti i business esistano (evita fallimento della transazione)
    if (assignToBusinessIds && assignToBusinessIds.length > 0) {
      const businesses = await prisma.business.findMany({
        where: { id: { in: assignToBusinessIds } },
        select: { id: true }
      });

      if (businesses.length !== assignToBusinessIds.length) {
        const foundIds = businesses.map(b => b.id);
        const notFound = assignToBusinessIds.filter(id => !foundIds.includes(id));
        return NextResponse.json(
          {
            message: "Alcuni business non esistono",
            notFoundBusinessIds: notFound
          },
          { status: StatusCodes.NotFound }
        );
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crea user, raider e assegnazioni in transazione
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
          createdByAdminId: auth.user.id, // Traccia admin creatore
          bussinesActived: assignToBusinessIds || [],
        }
      });

      // 3. Assegna a business se specificato
      if (assignToBusinessIds && assignToBusinessIds.length > 0) {
        await tx.businessRaider.createMany({
          data: assignToBusinessIds.map((businessId) => ({
            businessId,
            raiderId: raider.id,
            confirmedFromBusiness: true,
          })),
        });

        // Aggiorna array raiderActived nei Business (in parallelo)
        await Promise.all(
          assignToBusinessIds.map((businessId) =>
            tx.business.update({
              where: { id: businessId },
              data: {
                raiderActived: {
                  push: raider.id
                }
              }
            })
          )
        );
      }

      return { user, raider };
    }, {
      maxWait: 10000,
      timeout: 30000,
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
          assignedBusinesses: assignToBusinessIds?.length || 0,
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
