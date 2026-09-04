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
    const completedCompensation = deliveries
      .filter(d => d.status === "COMPLETED")
      .reduce((sum, d) => sum + (d.compensation || 0), 0);

    // Scomposizione per singola attività gestita
    const businessesData = await prisma.business.findMany({
      where: { id: { in: assignedBusinessIds } },
      select: {
        id: true,
        bussinesName: true,
        deliveries: {
          where,
          select: { status: true, compensation: true },
        }
      }
    });

    const businessStats = businessesData
      .map(business => ({
        id: business.id,
        name: business.bussinesName,
        totalOrders: business.deliveries.length,
        completedOrders: business.deliveries.filter(d => d.status === "COMPLETED").length,
        totalCompensation: business.deliveries.reduce((sum, d) => sum + (d.compensation || 0), 0),
      }))
      .sort((a, b) => b.totalOrders - a.totalOrders);

    // Performance/compensi dei raider collegati alle attività gestite
    const raiderRelations = await prisma.businessRaider.findMany({
      where: { businessId: { in: assignedBusinessIds } },
      select: { raiderId: true },
      distinct: ["raiderId"],
    });
    const managedRaiderIds = raiderRelations.map(r => r.raiderId);

    const raiderAssignedCounts = await prisma.deliveryEA.groupBy({
      by: ["assignedToRaiderId"],
      where: { ...where, assignedToRaiderId: { in: managedRaiderIds } },
      _count: { id: true },
    });

    const raiderStats = await Promise.all(
      raiderAssignedCounts.map(async (perf) => {
        if (!perf.assignedToRaiderId) return null;

        const raider = await prisma.raider.findUnique({
          where: { id: perf.assignedToRaiderId },
          select: { name: true, surname: true },
        });

        const completed = await prisma.deliveryEA.findMany({
          where: { ...where, assignedToRaiderId: perf.assignedToRaiderId, status: "COMPLETED" },
          select: { compensation: true },
        });

        const notDelivered = await prisma.deliveryEA.count({
          where: { ...where, assignedToRaiderId: perf.assignedToRaiderId, status: "NOTDELIVERED" },
        });

        const compensation = completed.reduce((sum, d) => sum + (d.compensation || 0), 0);

        return {
          raiderId: perf.assignedToRaiderId,
          raiderName: raider ? `${raider.name} ${raider.surname}` : "Sconosciuto",
          totalAssigned: perf._count.id,
          completed: completed.length,
          notDelivered,
          compensation: compensation.toFixed(2),
          successRate: perf._count.id > 0
            ? ((completed.length / perf._count.id) * 100).toFixed(2) + "%"
            : "0%",
        };
      })
    );

    const filteredRaiderStats = raiderStats
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .sort((a, b) => b.completed - a.completed);

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
          completedCompensation: completedCompensation.toFixed(2),
          netProfit: (totalRevenue - completedCompensation).toFixed(2),
        },
        businesses: businessStats,
        raiders: filteredRaiderStats,
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
