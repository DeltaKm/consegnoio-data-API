
// import prisma from "@/app/lib/prisma";
// import { NextRequest, NextResponse } from "next/server";
// import { testDeliverySchema } from "@/lib/zod";


// enum StatusCodes {
//   NotFound = 404,
//   Success = 200,
//   Created = 201,
//   BadRequest = 400,
//   InternalServerError = 500,
// }


// export async function GET() {
//   try {
//     const delivery = await prisma.testDelivery.findMany({
//       orderBy: { createdAt: "desc" },
//     });
//     return NextResponse.json(delivery, { status: StatusCodes.Success });

//   } catch (error) {
//     console.error("Errore durante il fetch delle consegne", error);
//     return NextResponse.json(
//       { message: "Errore durante il fetch delle consegne" },
//       { status: StatusCodes.InternalServerError }
//     );
//   }
// }

// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json();
//     const result = testDeliverySchema.safeParse(body);

//     if (!result.success) {
//       return NextResponse.json(
//         { message: "Dati non validi", errors: result.error.errors },
//         { status: StatusCodes.BadRequest }
//       );
//     }

//     const dataToInsert = {
//       ...result.data,
//       schedulingDelivery: result.data.schedulingDelivery 
//         ? new Date(result.data.schedulingDelivery) 
//         : undefined,
//     };

//     const newDelivery = await prisma.testDelivery.create({ 
//       data: dataToInsert,
//     });

//     return NextResponse.json(newDelivery, { status: StatusCodes.Created });
//   } catch (error) {
//     console.error("Errore durante la creazione dell'ordine", error);
//     return NextResponse.json(
//       { message: "Errore durante la creazione dell'ordine" },
//       { status: StatusCodes.InternalServerError }
//     );
//   }
// }


// export async function DELETE(request: NextRequest) {
//   try {
//     const id = request.nextUrl.searchParams.get("id");

//     if (!id) {
//       return NextResponse.json(
//         { message: "ID richiesto" },
//         { status: StatusCodes.BadRequest }
//       );
//     }

//     const deletedDelivery = await prisma.testDelivery.delete({ where: { id } });

//     return NextResponse.json(deletedDelivery, { status: StatusCodes.Success });
//   } catch (error) {
//     console.error("Errore durante l'eliminazione dell'ordine", error);
//     return NextResponse.json(
//       { message: "Errore durante l'eliminazione dell'ordine" },
//       { status: StatusCodes.InternalServerError }
//     );
//   }
// }


// export async function PATCH(request: NextRequest) {
//   try {
//     const id = request.nextUrl.searchParams.get("id");

//     if (!id) {
//       return NextResponse.json(
//         { message: "ID richiesto" },
//         { status: 400 } 
//       );
//     }

//     const body = await request.json();

//     const result = testDeliverySchema.safeParse(body);

//     if (!result.success) {
//       console.error("Errore di validazione:", result.error.errors);
//       return NextResponse.json(
//         { message: "Dati non validi", errors: result.error.errors },
//         { status: 400 } 
//       );
//     }

//     const data = result.data;

//     const updatedDelivery = await prisma.testDelivery.update({
//       where: { id }, 
//       data, // <= qua va passato solo il campo da variaree invece che rendere opzionale i campi cona la validazione di zod
//     });

//     return NextResponse.json(updatedDelivery, { status: 200 }); 
//   } catch (error) {
//     console.error("Errore durante l'aggiornamento dell'ordine:", error);
//     return NextResponse.json(
//       { message: "Errore durante l'aggiornamento dell'ordine" },
//       { status: 500 } 
//     );
//   }
// }

// app/api/v1/test/route.ts
import prisma from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { testDeliveryEASchema } from "@/lib/zod";

enum StatusCodes {
  BadRequest = 400,
  Success = 200,
  NotFound = 404,
  InternalServerError = 500,
}

// GET: Recupera tutte le consegne (testDeliveryEA) ordinate per createdAt decrescente
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

// POST: Crea una nuova consegna (testDeliveryEA) utilizzando lo schema Zod
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
            // Altri campi possono essere opzionali
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

    // I dati validati sono già nel formato corretto grazie al preprocess per le date.
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

// DELETE: Elimina una consegna; l'id viene passato come query parameter, es. ?id=DELIVERY_ID
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
      return NextResponse.json(
        { message: "Dati non validi", errors: result.error.errors },
        { status: StatusCodes.BadRequest }
      );
    }

    const data = result.data;

    const updatedDelivery = await prisma.testDeliveryEA.update({
      where: { id },
      data, // Aggiorna i campi passati
    });

    return NextResponse.json(updatedDelivery, { status: StatusCodes.Success });
  } catch (error: any) {
    console.error("Errore durante l'aggiornamento dell'ordine:", error);
    return NextResponse.json(
      { message: "Errore durante l'aggiornamento dell'ordine", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}