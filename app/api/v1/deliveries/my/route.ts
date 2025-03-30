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

  try {
    const raider = await prisma.raider.findFirst({ where: { userId } });

    if (!raider) {
      return NextResponse.json(
        { message: "Profilo Raider non trovato" },
        { status: 404 }
      );
    }

    const assignedDeliveries = await prisma.assignedDelivery.findMany({
      where: { raiderId: raider.id },
      include: {
        delivery: true,
      },
    });

    const deliveries = assignedDeliveries
      .map((assigned) => assigned.delivery)
      .filter(
        (delivery) =>
          delivery?.status !== "COMPLETED" &&
          delivery?.status !== "NOTDELIVERED"
      );

    return NextResponse.json(deliveries, { status: 200 });
  } catch (error: any) {
    console.error("Errore durante il recupero delle consegne assegnate:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: 500 }
    );
  }
}
