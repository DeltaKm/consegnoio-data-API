import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";

enum StatusCodes {
  Success = 200,
  Unauthorized = 401,
  InternalServerError = 500,
}

// GET - Statistiche globali sistema (Admin vede tutto)
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
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const dateFilter: any = {};
    if (dateFrom) dateFilter.gte = new Date(dateFrom);
    if (dateTo) dateFilter.lte = new Date(dateTo);

    const deliveryWhere: any = {};
    if (dateFrom || dateTo) {
      deliveryWhere.createdAt = dateFilter;
    }

    const [
      totalUsers,
      totalBusinesses,
      totalLogistics,
      totalRaiders,
      activeRaiders,
      totalDeliveries,
      createdDeliveries,
      assignedDeliveries,
      onDeliveryDeliveries,
      completedDeliveries,
      notDeliveredDeliveries,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.business.count(),
      prisma.logistics.count(),
      prisma.raider.count(),
      prisma.raider.count({ where: { isActive: true } }),
      prisma.deliveryEA.count({ where: deliveryWhere }),
      prisma.deliveryEA.count({ where: { ...deliveryWhere, status: "CREATED" } }),
      prisma.deliveryEA.count({ where: { ...deliveryWhere, status: "ASSIGNED" } }),
      prisma.deliveryEA.count({ where: { ...deliveryWhere, status: "ONDELIVERY" } }),
      prisma.deliveryEA.count({ where: { ...deliveryWhere, status: "COMPLETED" } }),
      prisma.deliveryEA.count({ where: { ...deliveryWhere, status: "NOTDELIVERED" } }),
    ]);

    const deliveries = await prisma.deliveryEA.findMany({
      where: deliveryWhere,
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

    // Top 10 business per ordini: prima si individuano i business con più ordini
    // via groupBy a livello di DB, poi si calcolano i dettagli solo per quelli.
    // (In precedenza si prendevano i primi 10 business dal DB in ordine arbitrario
    // e si ordinava solo tra quelli: quasi mai erano i business realmente più attivi.)
    const topBusinessGroups = await prisma.deliveryEA.groupBy({
      by: ["businessId"],
      where: { ...deliveryWhere, businessId: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    });

    const topBusinessIds = topBusinessGroups
      .map(g => g.businessId)
      .filter((id): id is string => id !== null);

    const topBusinessesData = await prisma.business.findMany({
      where: { id: { in: topBusinessIds } },
      include: {
        deliveries: {
          where: deliveryWhere,
          select: {
            status: true,
            compensation: true,
          }
        }
      },
    });

    const businessStats = topBusinessesData
      .map(business => ({
        id: business.id,
        name: business.bussinesName,
        totalOrders: business.deliveries.length,
        completedOrders: business.deliveries.filter(d => d.status === "COMPLETED").length,
        totalCompensation: business.deliveries.reduce((sum, d) => sum + (d.compensation || 0), 0),
      }))
      .sort((a, b) => b.totalOrders - a.totalOrders);

    // Top 10 raider per consegne completate: stesso fix, via groupBy su HistoryDelivery.
    const topRaiderGroups = await prisma.historyDelivery.groupBy({
      by: ["raiderId"],
      where: dateFrom || dateTo ? { createdAt: dateFilter } : undefined,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    });

    const topRaiderIds = topRaiderGroups.map(g => g.raiderId);
    const raidersData = await prisma.raider.findMany({
      where: { id: { in: topRaiderIds } },
      select: { id: true, name: true, surname: true },
    });
    const raiderCountById = new Map(topRaiderGroups.map(g => [g.raiderId, g._count.id]));

    const raiderStats = raidersData
      .map(raider => ({
        id: raider.id,
        name: `${raider.name} ${raider.surname}`,
        completedDeliveries: raiderCountById.get(raider.id) ?? 0,
      }))
      .sort((a, b) => b.completedDeliveries - a.completedDeliveries);

    return NextResponse.json(
      {
        period: {
          from: dateFrom || "All time",
          to: dateTo || "Now",
        },
        overview: {
          totalUsers,
          totalBusinesses,
          totalLogistics,
          totalRaiders,
          activeRaiders,
        },
        deliveries: {
          total: totalDeliveries,
          byStatus: {
            created: createdDeliveries,
            assigned: assignedDeliveries,
            onDelivery: onDeliveryDeliveries,
            completed: completedDeliveries,
            notDelivered: notDeliveredDeliveries,
          }
        },
        financial: {
          totalRevenue: totalRevenue.toFixed(2),
          totalCompensation: totalCompensation.toFixed(2),
          completedCompensation: completedCompensation.toFixed(2),
          netProfit: (totalRevenue - completedCompensation).toFixed(2),
        },
        topBusinesses: businessStats,
        topRaiders: raiderStats,
      },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore statistiche admin:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
