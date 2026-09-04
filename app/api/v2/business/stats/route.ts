import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireBusiness } from "@/app/lib/auth";

enum StatusCodes {
  Success = 200,
  BadRequest = 400,
  Unauthorized = 401,
  InternalServerError = 500,
}

// GET - Statistiche business
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
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const raiderIdFilter = searchParams.get("raiderId");

    const dateFilter: any = {};
    if (dateFrom) dateFilter.gte = new Date(dateFrom);
    if (dateTo) dateFilter.lte = new Date(dateTo);

    if (raiderIdFilter) {
      const relation = await prisma.businessRaider.findFirst({
        where: { businessId: auth.business.id, raiderId: raiderIdFilter },
      });
      if (!relation) {
        return NextResponse.json(
          { message: "Questo raider non è collegato alla tua attività" },
          { status: StatusCodes.BadRequest }
        );
      }
    }

    const where: any = {
      businessId: auth.business.id,
    };

    if (dateFrom || dateTo) {
      where.createdAt = dateFilter;
    }

    if (raiderIdFilter) {
      where.assignedToRaiderId = raiderIdFilter;
    }

    // Conta ordini per status
    const [
      totalOrders,
      createdOrders,
      assignedOrders,
      onDeliveryOrders,
      completedOrders,
      notDeliveredOrders,
      cancelledOrders,
    ] = await Promise.all([
      prisma.deliveryEA.count({ where }),
      prisma.deliveryEA.count({ where: { ...where, status: "CREATED" } }),
      prisma.deliveryEA.count({ where: { ...where, status: "ASSIGNED" } }),
      prisma.deliveryEA.count({ where: { ...where, status: "ONDELIVERY" } }),
      prisma.deliveryEA.count({ where: { ...where, status: "COMPLETED" } }),
      prisma.deliveryEA.count({ where: { ...where, status: "NOTDELIVERED" } }),
      prisma.deliveryEA.count({ where: { ...where, status: "DELETED" } }),
    ]);

    // Calcola costi (stesso risultato riusato sotto per la performance raider,
    // per evitare un N+1 di query separate per ogni raider)
    const deliveries = await prisma.deliveryEA.findMany({
      where,
      select: {
        compensation: true,
        totalPaid: true,
        status: true,
        assignedToRaiderId: true,
      }
    });

    const totalCompensation = deliveries.reduce((sum, d) => sum + (d.compensation || 0), 0);
    const totalRevenue = deliveries.reduce((sum, d) => sum + (d.totalPaid || 0), 0);
    const completedCompensation = deliveries
      .filter(d => d.status === "COMPLETED")
      .reduce((sum, d) => sum + (d.compensation || 0), 0);

    // Performance raider, calcolata in memoria da `deliveries` già caricato
    // sopra (evita un N+1 di query separate per ogni raider).
    const involvedRaiderIds = Array.from(
      new Set(deliveries.map(d => d.assignedToRaiderId).filter((id): id is string => id !== null))
    );

    const raidersInfo = await prisma.raider.findMany({
      where: { id: { in: involvedRaiderIds } },
      select: { id: true, name: true, surname: true },
    });
    const raiderNameById = new Map(raidersInfo.map(r => [r.id, `${r.name} ${r.surname}`]));

    const filteredRaiderStats = involvedRaiderIds.map((raiderId) => {
      const raiderDeliveries = deliveries.filter(d => d.assignedToRaiderId === raiderId);
      const completedDeliveries = raiderDeliveries.filter(d => d.status === "COMPLETED");
      const notDelivered = raiderDeliveries.filter(d => d.status === "NOTDELIVERED").length;
      const compensation = completedDeliveries.reduce((sum, d) => sum + (d.compensation || 0), 0);

      return {
        raiderId,
        raiderName: raiderNameById.get(raiderId) ?? "Unknown",
        totalAssigned: raiderDeliveries.length,
        completed: completedDeliveries.length,
        notDelivered,
        compensation: compensation.toFixed(2),
        successRate: raiderDeliveries.length > 0
          ? ((completedDeliveries.length / raiderDeliveries.length) * 100).toFixed(2) + '%'
          : '0%',
      };
    });

    return NextResponse.json(
      {
        period: {
          from: dateFrom || "All time",
          to: dateTo || "Now",
        },
        orders: {
          total: totalOrders,
          byStatus: {
            created: createdOrders,
            assigned: assignedOrders,
            onDelivery: onDeliveryOrders,
            completed: completedOrders,
            notDelivered: notDeliveredOrders,
            cancelled: cancelledOrders,
          }
        },
        financial: {
          totalRevenue: totalRevenue.toFixed(2),
          totalCompensation: totalCompensation.toFixed(2),
          completedCompensation: completedCompensation.toFixed(2),
          netProfit: (totalRevenue - completedCompensation).toFixed(2),
        },
        raiders: {
          total: auth.business.raiderActived.length,
          performance: filteredRaiderStats,
        }
      },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore recupero statistiche:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
