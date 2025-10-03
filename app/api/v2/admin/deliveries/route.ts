import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";

enum StatusCodes {
  Success = 200,
  Unauthorized = 401,
  InternalServerError = 500,
}

// GET - Vista globale ordini (Admin vede tutto)
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
    const status = searchParams.get("status");
    const businessId = searchParams.get("businessId");
    const raiderId = searchParams.get("raiderId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (businessId) {
      where.businessId = businessId;
    }

    if (raiderId) {
      where.assignedToRaiderId = raiderId;
    }

    if (dateFrom || dateTo) {
      where.schedulingDelivery = {};
      if (dateFrom) where.schedulingDelivery.gte = new Date(dateFrom);
      if (dateTo) where.schedulingDelivery.lte = new Date(dateTo);
    }

    const [deliveries, total] = await Promise.all([
      prisma.deliveryEA.findMany({
        where,
        include: {
          business: {
            select: {
              id: true,
              bussinesName: true,
            }
          },
          assignedToRaider: {
            select: {
              id: true,
              name: true,
              surname: true,
              vehicle: true,
            }
          }
        },
        orderBy: { schedulingDelivery: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.deliveryEA.count({ where }),
    ]);

    return NextResponse.json(
      {
        deliveries,
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
    console.error("Errore recupero deliveries:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
