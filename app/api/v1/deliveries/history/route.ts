import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { authenticateToken } from "@/app/lib/auth";

export async function GET(request: NextRequest) {
  const decoded = await authenticateToken(request);
  if (!decoded) {
    return NextResponse.json(
      { message: "Utente non autorizzato" },
      { status: 401 }
    );
  }

  const userId = decoded.userId;

  const raider = await prisma.raider.findFirst({ where: { userId } });
  if (!raider) {
    return NextResponse.json(
      { message: "Profilo Raider non trovato" },
      { status: 404 }
    );
  }

  try {
    const [completedDeliveries, cancelledDeliveries] = await Promise.all([
      prisma.historyDelivery.findMany({
        where: { raiderId: raider.id },
        include: { delivery: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.cancelledDeliveries.findMany({
        where: { raiderId: raider.id },
        include: { delivery: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const deliveries = [
      ...completedDeliveries.map((entry) => ({
        ...entry.delivery,
        statusType: "COMPLETED",
      })),
      ...cancelledDeliveries.map((entry) => ({
        ...entry.delivery,
        note: entry.note,
        cancelledAt: entry.createdAt,
        statusType: "CANCELLED",
      })),
    ];

    // Rimuove eventuali duplicati usando Map con chiave `id`
    const uniqueMap = new Map();
    for (const delivery of deliveries) {
      uniqueMap.set(delivery.id, delivery);
    }

    return NextResponse.json(Array.from(uniqueMap.values()));
  } catch (error: any) {
    console.error("Errore nel recupero dello storico consegne:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: 500 }
    );
  }
}
