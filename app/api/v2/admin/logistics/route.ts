import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";

enum StatusCodes {
  Success = 200,
  Unauthorized = 401,
  InternalServerError = 500,
}

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
