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

//     const data = result.data;

//     const newDelivery = await prisma.testDelivery.create({ 
//       data: {
//         name: data.name,
//         pickupAddress: data.pickupAddress,
//         deliveryAddress: data.deliveryAddress,
//         compensation: data.compensation
//     },
//    });
   

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
//         { status: StatusCodes.BadRequest }
//       );
//     }

//     const body = await request.json();
//     const result = testDeliverySchema.partial().safeParse(body);

//     if (!result.success) {
//       return NextResponse.json(
//         { message: "Dati non validi", errors: result.error.errors },
//         { status: StatusCodes.BadRequest }
//       );
//     }

//     const data = result.data;
//     const updatedDelivery = await prisma.testDelivery.update({
//       where: { id },
//       data,
//     });

//     return NextResponse.json(updatedDelivery, { status: StatusCodes.Success });
//   } catch (error) {
//     console.error("Errore durante l'aggiornamento dell'ordine", error);
//     return NextResponse.json(
//       { message: "Errore durante l'aggiornamento dell'ordine" },
//       { status: StatusCodes.InternalServerError }
//     );
//   }
// }


import prisma from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { testDeliverySchema } from "@/lib/zod";


enum StatusCodes {
  NotFound = 404,
  Success = 200,
  Created = 201,
  BadRequest = 400,
  InternalServerError = 500,
}


export async function GET() {
  try {
    const delivery = await prisma.testDelivery.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(delivery, { status: StatusCodes.Success });
  } catch (error) {
    console.error("Errore durante il fetch delle consegne", error);
    return NextResponse.json(
      { message: "Errore durante il fetch delle consegne" },
      { status: StatusCodes.InternalServerError }
    );
  }
}



export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = testDeliverySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: "Dati non validi", errors: result.error.errors },
        { status: StatusCodes.BadRequest }
      );
    }

    const newDelivery = await prisma.testDelivery.create({ 
      data: result.data,
    });

    return NextResponse.json(newDelivery, { status: StatusCodes.Created });
  } catch (error) {
    console.error("Errore durante la creazione dell'ordine", error);
    return NextResponse.json(
      { message: "Errore durante la creazione dell'ordine" },
      { status: StatusCodes.InternalServerError }
    );
  }
}


export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { message: "ID richiesto" },
        { status: StatusCodes.BadRequest }
      );
    }

    const deletedDelivery = await prisma.testDelivery.delete({ where: { id } });

    return NextResponse.json(deletedDelivery, { status: StatusCodes.Success });
  } catch (error) {
    console.error("Errore durante l'eliminazione dell'ordine", error);
    return NextResponse.json(
      { message: "Errore durante l'eliminazione dell'ordine" },
      { status: StatusCodes.InternalServerError }
    );
  }
}




export async function PATCH(request: NextRequest) {
  try {
    // Ottieni l'ID dall'URL o dal corpo della richiesta
    const id = request.nextUrl.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { message: "ID richiesto" },
        { status: 400 } // Bad Request
      );
    }

    // Recupera il corpo della richiesta
    const body = await request.json();

    // Validazione dello schema Zod
    const result = testDeliverySchema.safeParse(body);

    if (!result.success) {
      console.error("Errore di validazione:", result.error.errors);
      return NextResponse.json(
        { message: "Dati non validi", errors: result.error.errors },
        { status: 400 } // Bad Request
      );
    }

    const data = result.data;

    // Aggiorna il documento su MongoDB con Prisma
    const updatedDelivery = await prisma.testDelivery.update({
      where: { id }, // Usa il campo `id` (che corrisponde a `_id` mappato in Prisma)
      data,
    });

    return NextResponse.json(updatedDelivery, { status: 200 }); // Successo
  } catch (error) {
    console.error("Errore durante l'aggiornamento dell'ordine:", error);
    return NextResponse.json(
      { message: "Errore durante l'aggiornamento dell'ordine" },
      { status: 500 } // Internal Server Error
    );
  }
}


