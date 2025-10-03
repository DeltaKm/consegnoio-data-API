import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireLogistics } from "@/app/lib/auth";

enum StatusCodes {
  Success = 200,
  Unauthorized = 401,
  InternalServerError = 500,
}

// GET - Statistiche dei business assegnati
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
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const dateFilter: any = {};
    if (dateFrom) dateFilter.gte = new Date(dateFrom);
    if (dateTo) dateFilter.lte = new Date(dateTo);

    // Ottieni IDs dei business assegnati
    const assignedBusinessIds = auth.logistics.businessRelations.map((rel: any) => rel.businessId);

    const where: any = {
      businessId: { in: assignedBusinessIds } // ← SOLO BUSINESS ASSEGNATI
    };
    
    if (dateFrom || dateTo) {
      where.createdAt = dateFilter;
    }

    const [
      totalBusinesses,
      totalDeliveries,
      completedDeliveries,
      ongoingDeliveries,
    ] = await Promise.all([
      prisma.business.count({ where: { id: { in: assignedBusinessIds } } }),
      prisma.deliveryEA.count({ where }),
      prisma.deliveryEA.count({ where: { ...where, status: "COMPLETED" } }),
      prisma.deliveryEA.count({ 
        where: { 
          ...where, 
          status: { in: ["ASSIGNED", "ONDELIVERY"] } 
        } 
      }),
    ]);

    const deliveries = await prisma.deliveryEA.findMany({
      where,
      select: {
        compensation: true,
        totalPaid: true,
        status: true,
      }
    });

    const totalRevenue = deliveries.reduce((sum, d) => sum + (d.totalPaid || 0), 0);
    const totalCompensation = deliveries.reduce((sum, d) => sum + (d.compensation || 0), 0);

    return NextResponse.json(
      {
        period: {
          from: dateFrom || "All time",
          to: dateTo || "Now",
        },
        overview: {
          totalBusinesses,
          totalDeliveries,
          completedDeliveries,
          ongoingDeliveries,
        },
        financial: {
          totalRevenue: totalRevenue.toFixed(2),
          totalCompensation: totalCompensation.toFixed(2),
          netProfit: (totalRevenue - totalCompensation).toFixed(2),
        }
      },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore statistiche globali:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
