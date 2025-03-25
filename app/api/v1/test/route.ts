
import prisma from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { testDeliveryEASchema } from "@/lib/zod";

enum StatusCodes {
  BadRequest = 400,
  Success = 200,
  NotFound = 404,
  InternalServerError = 500,
}

export async function GET(request: NextRequest) {
  try {
    const deliveries = await prisma.testDeliveryEA.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(deliveries, { status: StatusCodes.Success });
  } catch (error: any) {
    console.error("Error retrieving deliveries:", error);
    return NextResponse.json(
      { message: "Internal error while retrieving deliveries", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text();
    if (!bodyText || bodyText.trim() === "") {
      return NextResponse.json(
        {
          message: "Missing fields. Example of payload:",
          example: {
            idBusiness: "ID_Business",
            schedulingDelivery: "2025-03-12 21:00:00",
            customerName: "Valerio",
            customerSurname: "Poetico",
            customerAddress: "Via Gregorio D'alessandria",
            customerZipcode: "89900",
            customerProvince: "VV",
            customerCity: "Vibo Valentia",
            paymentType: "Contrassegno",
            totalPaid: 29.23,
            totalShipping: 5.23,
            note: "",
            customerCoordinates: "38.6748708,16.103075"
          },
        },
        { status: StatusCodes.BadRequest }
      );
    }
    
    const parsed = testDeliveryEASchema.safeParse(JSON.parse(bodyText));
    if (!parsed.success) {
      const errorMessage = parsed.error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      return NextResponse.json({ message: errorMessage }, { status: StatusCodes.BadRequest });
    }

    const dataToInsert = { ...parsed.data };

    const newDelivery = await prisma.testDeliveryEA.create({
      data: dataToInsert,
    });

    return NextResponse.json(
      { result: "success", delivery: newDelivery },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Error creating testDeliveryEA:", error);
    return NextResponse.json(
      { message: "Internal error during creation", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { message: "ID is required" },
        { status: StatusCodes.BadRequest }
      );
    }
    const deletedDelivery = await prisma.testDeliveryEA.delete({ where: { id } });
    return NextResponse.json(deletedDelivery, { status: StatusCodes.Success });
  } catch (error: any) {
    console.error("Error deleting delivery:", error);
    return NextResponse.json(
      { message: "Internal error during deletion", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}


// export async function PATCH(request: NextRequest) {
//   try {
//     const id = request.nextUrl.searchParams.get("id");
//     if (!id) {
//       return NextResponse.json(
//         { message: "ID richiesto" },
//         { status: StatusCodes.BadRequest }
//       );
//     }

//     const body = await request.json();
//     const result = testDeliveryEASchema.safeParse(body);

//     if (!result.success) {
//       console.error("Errore di validazione:", result.error.errors);
//       return NextResponse.json(
//         { message: "Dati non validi", errors: result.error.errors },
//         { status: StatusCodes.BadRequest }
//       );
//     }

//     const data = result.data;

//     const updatedDelivery = await prisma.testDeliveryEA.update({
//       where: { id },
//       data, 
//     });

//     return NextResponse.json(updatedDelivery, { status: StatusCodes.Success });
//   } catch (error: any) {
//     console.error("Errore durante l'aggiornamento dell'ordine:", error);
//     return NextResponse.json(
//       { message: "Errore durante l'aggiornamento dell'ordine", error: error.message },
//       { status: StatusCodes.InternalServerError }
//     );
//   }
// }

export async function PATCH(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { message: "ID richiesto" },
        { status: StatusCodes.BadRequest }
      );
    }

    const body = await request.json();
    const result = testDeliveryEASchema.safeParse(body);

    if (!result.success) {
      console.error("Errore di validazione:", result.error.errors);
      const errorMessage = result.error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      return NextResponse.json({ message: errorMessage }, { status: StatusCodes.BadRequest });
    }

    const data = result.data;

    // Aggiorna la delivery nel modello testDeliveryEA
    const updatedDelivery = await prisma.testDeliveryEA.update({
      where: { id },
      data, 
    });

    // Se nel payload è presente il campo status, mappa il valore e invia la richiesta all'endpoint esterno
    if (data.status) {
      // Mappatura dei valori locali ai valori attesi dal servizio esterno
      const mapping: Record<string, string> = {
        "CREATED": "in_approval",
        "ASSIGNED": "in_progress",
        "ONDELIVERY": "shipped",
        "COMPLETED": "delivered",
        "NOTDELIVERED": "returned",
        "DELETED": "canceled"
      };

      const stateValue = mapping[data.status];
      // Se esiste una mapping e il record aggiornato contiene un orderId, effettua la POST
      if (stateValue && updatedDelivery.orderId) {
        await fetch("https://app.easyappear.it/webservice/set_order_state_consegnoio/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: updatedDelivery.orderId,
            state: stateValue
          })
        });
      }
    }

    return NextResponse.json(updatedDelivery, { status: StatusCodes.Success });
  } catch (error: any) {
    console.error("Errore durante l'aggiornamento dell'ordine:", error);
    return NextResponse.json(
      { message: "Errore durante l'aggiornamento dell'ordine", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
