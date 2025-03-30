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
    const completedDeliveries = await prisma.historyDelivery.findMany({
      where: { raiderId: raider.id },
      include: {
        delivery: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Deduplica per delivery.id
    const uniqueDeliveriesMap = new Map();
    for (const entry of completedDeliveries) {
      if (!uniqueDeliveriesMap.has(entry.delivery.id)) {
        uniqueDeliveriesMap.set(entry.delivery.id, entry.delivery);
      }
    }

    const uniqueDeliveries = Array.from(uniqueDeliveriesMap.values());

    return NextResponse.json(uniqueDeliveries);
  } catch (error: any) {
    console.error("Errore nel recupero delle consegne completate:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: 500 }
    );
  }
}
