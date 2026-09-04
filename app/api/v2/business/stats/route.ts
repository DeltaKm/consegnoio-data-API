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

    // Calcola costi
    const deliveries = await prisma.deliveryEA.findMany({
      where,
      select: {
        compensation: true,
        totalPaid: true,
        status: true,
      }
    });

    const totalCompensation = deliveries.reduce((sum, d) => sum + (d.compensation || 0), 0);
    const totalRevenue = deliveries.reduce((sum, d) => sum + (d.totalPaid || 0), 0);
    const completedCompensation = deliveries
      .filter(d => d.status === "COMPLETED")
      .reduce((sum, d) => sum + (d.compensation || 0), 0);

    // Performance raider
    const raiderPerformance = await prisma.deliveryEA.groupBy({
      by: ['assignedToRaiderId'],
      where: {
        ...where,
        assignedToRaiderId: { not: null },
      },
      _count: {
        id: true,
      }
    });

    const raiderStats = await Promise.all(
      raiderPerformance.map(async (perf) => {
        if (!perf.assignedToRaiderId) return null;

        const raider = await prisma.raider.findUnique({
          where: { id: perf.assignedToRaiderId },
          select: {
            id: true,
            name: true,
            surname: true,
          }
        });

        const completedDeliveries = await prisma.deliveryEA.findMany({
          where: {
            ...where,
            assignedToRaiderId: perf.assignedToRaiderId,
            status: "COMPLETED",
          },
          select: { compensation: true },
        });

        const notDelivered = await prisma.deliveryEA.count({
          where: {
            ...where,
            assignedToRaiderId: perf.assignedToRaiderId,
            status: "NOTDELIVERED",
          }
        });

        const compensation = completedDeliveries.reduce((sum, d) => sum + (d.compensation || 0), 0);

        return {
          raiderId: perf.assignedToRaiderId,
          raiderName: raider ? `${raider.name} ${raider.surname}` : "Unknown",
          totalAssigned: perf._count.id,
          completed: completedDeliveries.length,
          notDelivered,
          compensation: compensation.toFixed(2),
          successRate: perf._count.id > 0
            ? ((completedDeliveries.length / perf._count.id) * 100).toFixed(2) + '%'
            : '0%',
        };
      })
    );

    const filteredRaiderStats = raiderStats.filter(s => s !== null);

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
