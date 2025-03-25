// app/api/v1/deliveries/route.ts
import prisma from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateDeliverySchema = z.object({
  status: z.enum(["ASSIGNED", "COMPLETED", "CANCELLED"]),
  raiderId: z.string().optional(), // richiesto per ASSIGNED e COMPLETED
  note: z.string().optional(), // per eventuali note in caso di cancellazione
});

enum StatusCodes {
  Success = 200,
  BadRequest = 400,
  NotFound = 404,
  InternalServerError = 500,
}

export async function PATCH(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ message: "ID richiesto" }, { status: StatusCodes.BadRequest });
    }

    const body = await request.json();
    const parseResult = updateDeliverySchema.safeParse(body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.errors.map(e => e.message).join(', ');
      return NextResponse.json({ message: errorMessage }, { status: StatusCodes.BadRequest });
    }
    const { status, raiderId, note } = parseResult.data;

    // Aggiorna la consegna principale
    const updatedDelivery = await prisma.testDeliveryEA.update({
      where: { id },
      data: { 
        status, 
        ...(status === "ASSIGNED" && { isAssigned: true }), 
        ...(status === "COMPLETED" && { isCompleted: true })
      },
    });

    // A seconda dello status, crea il record appropriato
    if (status === "ASSIGNED" && raiderId) {
      await prisma.aassignedDelivery.create({
        data: {
          deliveryId: id,
          raiderId,
        },
      });
    } else if (status === "COMPLETED" && raiderId) {
      await prisma.historyDelivery.create({
        data: {
          deliveryId: id,
          raiderId,
        },
      });
    } else if (status === "CANCELLED") {
      // In questo esempio, usiamo raiderId come userId per la cancellazione; potresti avere una logica diversa.
      await prisma.cancelledDeliveries.create({
        data: {
          deliveryId: id,
          userId: raiderId || "",
          note: note || "",
        },
      });
    }

    return NextResponse.json(updatedDelivery, { status: StatusCodes.Success });
  } catch (error: any) {
    console.error("Errore durante l'aggiornamento della consegna:", error);
    return NextResponse.json(
      { message: "Errore interno durante l'aggiornamento della consegna", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
