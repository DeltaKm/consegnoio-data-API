import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireLogistics } from "@/app/lib/auth";

enum StatusCodes {
  Success = 200,
  BadRequest = 400,
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
    const businessIdFilter = searchParams.get("businessId");
    const raiderIdFilter = searchParams.get("raiderId");

    const dateFilter: any = {};
    if (dateFrom) dateFilter.gte = new Date(dateFrom);
    if (dateTo) dateFilter.lte = new Date(dateTo);

    // Ottieni IDs dei business assegnati
    const assignedBusinessIds = auth.logistics.businessRelations.map((rel: any) => rel.businessId);

    if (businessIdFilter && !assignedBusinessIds.includes(businessIdFilter)) {
      return NextResponse.json(
        { message: "Non gestisci questa attività" },
        { status: StatusCodes.BadRequest }
      );
    }

    // Raider collegati alle attività gestite (prima del filtro data, serve per validare raiderId)
    const raiderRelations = await prisma.businessRaider.findMany({
      where: { businessId: { in: assignedBusinessIds } },
      select: { raiderId: true },
      distinct: ["raiderId"],
    });
    const managedRaiderIds = raiderRelations.map(r => r.raiderId);

    if (raiderIdFilter && !managedRaiderIds.includes(raiderIdFilter)) {
      return NextResponse.json(
        { message: "Questo raider non è collegato alle tue attività" },
        { status: StatusCodes.BadRequest }
      );
    }

    // Se filtrato per una singola attività, restringi lo scope; altrimenti tutte quelle gestite
    const scopedBusinessIds = businessIdFilter ? [businessIdFilter] : assignedBusinessIds;

    const where: any = {
      businessId: { in: scopedBusinessIds }
    };

    if (dateFrom || dateTo) {
      where.createdAt = dateFilter;
    }

    if (raiderIdFilter) {
      where.assignedToRaiderId = raiderIdFilter;
    }

    const [
      totalBusinesses,
      totalRaiders,
      activeRaiders,
      totalDeliveries,
      createdDeliveries,
      assignedDeliveries,
      onDeliveryDeliveries,
      completedDeliveries,
      notDeliveredDeliveries,
    ] = await Promise.all([
      prisma.business.count({ where: { id: { in: scopedBusinessIds } } }),
      prisma.raider.count({
        where: { businessRelations: { some: { businessId: { in: scopedBusinessIds } } } }
      }),
      prisma.raider.count({
        where: {
          isActive: true,
          businessRelations: { some: { businessId: { in: scopedBusinessIds } } }
        }
      }),
      prisma.deliveryEA.count({ where }),
      prisma.deliveryEA.count({ where: { ...where, status: "CREATED" } }),
      prisma.deliveryEA.count({ where: { ...where, status: "ASSIGNED" } }),
      prisma.deliveryEA.count({ where: { ...where, status: "ONDELIVERY" } }),
      prisma.deliveryEA.count({ where: { ...where, status: "COMPLETED" } }),
      prisma.deliveryEA.count({ where: { ...where, status: "NOTDELIVERED" } }),
    ]);

    const ongoingDeliveries = assignedDeliveries + onDeliveryDeliveries;

    const deliveries = await prisma.deliveryEA.findMany({
      where,
      select: {
        compensation: true,
        totalPaid: true,
        status: true,
        assignedToRaiderId: true,
      }
    });

    const totalRevenue = deliveries.reduce((sum, d) => sum + (d.totalPaid || 0), 0);
    const totalCompensation = deliveries.reduce((sum, d) => sum + (d.compensation || 0), 0);
    const completedCompensation = deliveries
      .filter(d => d.status === "COMPLETED")
      .reduce((sum, d) => sum + (d.compensation || 0), 0);

    // Scomposizione per singola attività gestita
    const businessesData = await prisma.business.findMany({
      where: { id: { in: scopedBusinessIds } },
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

    // Performance/compensi dei raider collegati alle attività (nello scope corrente)
    const raiderAssignedCounts = await prisma.deliveryEA.groupBy({
      by: ["assignedToRaiderId"],
      where: raiderIdFilter
        ? { ...where }
        : { ...where, assignedToRaiderId: { in: managedRaiderIds } },
      _count: { id: true },
    });

    // Solo 1 query in più (i nomi): il resto è ricavato da `deliveries` già
    // caricato sopra, evitando un N+1 senza limite per ogni raider.
    const involvedRaiderIds = raiderAssignedCounts
      .map(p => p.assignedToRaiderId)
      .filter((id): id is string => id !== null);

    const raidersInfo = await prisma.raider.findMany({
      where: { id: { in: involvedRaiderIds } },
      select: { id: true, name: true, surname: true },
    });

    const raiderNameById = new Map(raidersInfo.map(r => [r.id, `${r.name} ${r.surname}`]));

    const filteredRaiderStats = raiderAssignedCounts
      .filter((perf): perf is typeof perf & { assignedToRaiderId: string } => perf.assignedToRaiderId !== null)
      .map((perf) => {
        const raiderDeliveries = deliveries.filter(d => d.assignedToRaiderId === perf.assignedToRaiderId);
        const completed = raiderDeliveries.filter(d => d.status === "COMPLETED");
        const notDelivered = raiderDeliveries.filter(d => d.status === "NOTDELIVERED").length;
        const compensation = completed.reduce((sum, d) => sum + (d.compensation || 0), 0);

        return {
          raiderId: perf.assignedToRaiderId,
          raiderName: raiderNameById.get(perf.assignedToRaiderId) ?? "Sconosciuto",
          totalAssigned: perf._count.id,
          completed: completed.length,
          notDelivered,
          compensation: compensation.toFixed(2),
          successRate: perf._count.id > 0
            ? ((completed.length / perf._count.id) * 100).toFixed(2) + "%"
            : "0%",
        };
      })
      .sort((a, b) => b.completed - a.completed);

    return NextResponse.json(
      {
        period: {
          from: dateFrom || "All time",
          to: dateTo || "Now",
        },
        overview: {
          totalBusinesses,
          totalRaiders,
          activeRaiders,
          totalDeliveries,
          completedDeliveries,
          ongoingDeliveries,
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
