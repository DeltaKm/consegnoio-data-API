import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";

enum StatusCodes {
  Success = 200,
  BadRequest = 400,
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
    const logisticsIdFilter = searchParams.get("logisticsId");
    const businessIdFilter = searchParams.get("businessId");
    const raiderIdFilter = searchParams.get("raiderId");

    const dateFilter: any = {};
    if (dateFrom) dateFilter.gte = new Date(dateFrom);
    if (dateTo) dateFilter.lte = new Date(dateTo);

    // Se filtrato per logistica, restringi alle sue attività (e valida businessId se presente insieme)
    let scopedBusinessIds: string[] | null = null;
    if (logisticsIdFilter) {
      const rels = await prisma.logisticsBusiness.findMany({
        where: { logisticsId: logisticsIdFilter },
        select: { businessId: true },
      });
      const managedIds = rels.map(r => r.businessId);
      if (businessIdFilter && !managedIds.includes(businessIdFilter)) {
        return NextResponse.json(
          { message: "Questa attività non è gestita da questa logistica" },
          { status: StatusCodes.BadRequest }
        );
      }
      scopedBusinessIds = businessIdFilter ? [businessIdFilter] : managedIds;
    } else if (businessIdFilter) {
      scopedBusinessIds = [businessIdFilter];
    }

    const deliveryWhere: any = {};
    if (dateFrom || dateTo) {
      deliveryWhere.createdAt = dateFilter;
    }
    if (scopedBusinessIds) {
      deliveryWhere.businessId = { in: scopedBusinessIds };
    }
    if (raiderIdFilter) {
      deliveryWhere.assignedToRaiderId = raiderIdFilter;
    }

    const raiderScopeWhere: any = {};
    if (scopedBusinessIds) {
      raiderScopeWhere.businessRelations = { some: { businessId: { in: scopedBusinessIds } } };
    }
    if (raiderIdFilter) {
      raiderScopeWhere.id = raiderIdFilter;
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
      prisma.business.count({ where: scopedBusinessIds ? { id: { in: scopedBusinessIds } } : undefined }),
      prisma.logistics.count(),
      prisma.raider.count({ where: raiderScopeWhere }),
      prisma.raider.count({ where: { ...raiderScopeWhere, isActive: true } }),
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
      where: { ...deliveryWhere, businessId: scopedBusinessIds ? { in: scopedBusinessIds } : { not: null } },
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

    // Top 10 raider per consegne completate, via groupBy su HistoryDelivery,
    // scomposto anche per logistica/attività/raider se filtrato.
    const historyWhere: any = {};
    if (dateFrom || dateTo) historyWhere.createdAt = dateFilter;
    if (raiderIdFilter) historyWhere.raiderId = raiderIdFilter;
    if (scopedBusinessIds) historyWhere.delivery = { businessId: { in: scopedBusinessIds } };

    const topRaiderGroups = await prisma.historyDelivery.groupBy({
      by: ["raiderId"],
      where: historyWhere,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    });

    // Batch: 2 query totali invece di ~4 per ogni singolo top raider
    // (evita un N+1 che rischiava di far scadere il timeout della richiesta).
    const topRaiderIds = topRaiderGroups.map(g => g.raiderId);

    const [topRaidersInfo, topRaidersDeliveries] = await Promise.all([
      prisma.raider.findMany({
        where: { id: { in: topRaiderIds } },
        select: { id: true, name: true, surname: true },
      }),
      prisma.deliveryEA.findMany({
        where: { ...deliveryWhere, assignedToRaiderId: { in: topRaiderIds } },
        select: { assignedToRaiderId: true, status: true, compensation: true },
      }),
    ]);

    const raiderNameById = new Map(topRaidersInfo.map(r => [r.id, `${r.name} ${r.surname}`]));

    const raiderStats = topRaiderGroups.map((group) => {
      const raiderDeliveries = topRaidersDeliveries.filter(d => d.assignedToRaiderId === group.raiderId);
      const totalAssigned = raiderDeliveries.length;
      const completedDeliveriesList = raiderDeliveries.filter(d => d.status === "COMPLETED");
      const notDelivered = raiderDeliveries.filter(d => d.status === "NOTDELIVERED").length;
      const compensation = completedDeliveriesList.reduce((sum, d) => sum + (d.compensation || 0), 0);

      return {
        id: group.raiderId,
        name: raiderNameById.get(group.raiderId) ?? "Sconosciuto",
        completedDeliveries: group._count.id,
        totalAssigned,
        notDelivered,
        compensation: compensation.toFixed(2),
        successRate: totalAssigned > 0
          ? ((completedDeliveriesList.length / totalAssigned) * 100).toFixed(2) + "%"
          : "0%",
      };
    });

    raiderStats.sort((a, b) => b.completedDeliveries - a.completedDeliveries);

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
