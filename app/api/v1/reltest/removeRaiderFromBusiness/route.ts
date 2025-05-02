// // app/api/v1/reltest/removeRaiderFromBusiness/route.ts
// import prisma from "@/app/lib/prisma";
// import { NextRequest, NextResponse } from "next/server";

// enum StatusCodes {
//   NotFound = 404,
//   Success = 200,
//   Created = 201,
//   BadRequest = 400,
//   InternalServerError = 500,
// }

// export async function DELETE(request: NextRequest) {
//   try {   
//     const bodyText = await request.text();
//     if (!bodyText || bodyText.trim() === "") {
//       return NextResponse.json(
//         {
//           message: "Missing fields. Example of payload:",
//           example: { raiderId: "ID_Raider", businessId: "ID_Business" },
//         },
//         { status: StatusCodes.BadRequest }
//       );
//     }

//     const body = JSON.parse(bodyText);
//     const { raiderId, businessId } = body;

    
//     if (!raiderId || !businessId) {
//       return NextResponse.json(
//         {
//           message: "The fields raiderId and businessId are required.",
//           example: { raiderId: "ID_Raider", businessId: "ID_Business" },
//         },
//         { status: StatusCodes.BadRequest }
//       );
//     }
  
//     const existingRelation = await prisma.businessRaider.findFirst({
//       where: { raiderId, businessId },
//     });
//     if (!existingRelation) {
//       return NextResponse.json(
//         { message: "Relation not found. Raider is not assigned to the business." },
//         { status: StatusCodes.NotFound }
//       );
//     }
 
//     await prisma.businessRaider.delete({
//       where: { id: existingRelation.id },
//     });
  
//     const raider = await prisma.raider.findUnique({
//       where: { id: raiderId },
//     });
//     if (raider) {
//       const updatedBusinessActived = raider.bussinesActived.filter(
//         (bid: string) => bid !== businessId
//       );
//       await prisma.raider.update({
//         where: { id: raiderId },
//         data: { bussinesActived: updatedBusinessActived },
//       });
//     } else {
//       return NextResponse.json(
//         { message: "Raider not found" },
//         { status: StatusCodes.NotFound }
//       );
//     }

//     const business = await prisma.business.findUnique({
//       where: { id: businessId },
//     });
//     if (business) {
//       const updatedRaiderActived = business.raiderActived.filter(
//         (rid: string) => rid !== raiderId
//       );
//       await prisma.business.update({
//         where: { id: businessId },
//         data: { raiderActived: updatedRaiderActived },
//       });
//     } else {
//       return NextResponse.json(
//         { message: "Business not found" },
//         { status: StatusCodes.NotFound }
//       );
//     }

//     return NextResponse.json(
//       { message: "Relation removed successfully." },
//       { status: StatusCodes.Success }
//     );
//   } catch (error: any) {
//     console.error("Error during removal of relation:", error);
//     return NextResponse.json(
//       { message: "Internal error during removal", error: error.message },
//       { status: StatusCodes.InternalServerError }
//     );
//   }
// }

// app/api/v1/reltest/removeRaiderFromBusiness/route.ts
import prisma from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

enum StatusCodes {
  NotFound = 404,
  Success = 200,
  Created = 201,
  BadRequest = 400,
  InternalServerError = 500,
}

export async function DELETE(request: NextRequest) {
  try {
    const { raiderId, businessIds } = await request.json();

    // 1) Validazione payload
    if (
      !raiderId ||
      !Array.isArray(businessIds) ||
      businessIds.length === 0
    ) {
      return NextResponse.json(
        {
          message:
            "Devi passare raiderId e un array non vuoto di businessIds",
        },
        { status: StatusCodes.BadRequest }
      );
    }

    // 2) Verifica che il Raider esista e prendi il suo array bussinesActived
    const raider = await prisma.raider.findUnique({
      where: { id: raiderId },
      select: { bussinesActived: true },
    });
    if (!raider) {
      return NextResponse.json(
        { message: "Raider non trovato" },
        { status: StatusCodes.BadRequest }
      );
    }

    // 3) Tenta di recuperare i Business ancora esistenti
    const businesses = await prisma.business.findMany({
      where: { id: { in: businessIds } },
      select: { id: true, raiderActived: true },
    });
    const foundIds = businesses.map((b) => b.id);
    const missing = businessIds.filter((id) => !foundIds.includes(id));

    // 4) Transazione: elimina pivot e aggiorna array
    await prisma.$transaction(async (tx) => {
      // 4.a) Elimina tutte le relazioni BusinessRaider per quei businessIds
      await tx.businessRaider.deleteMany({
        where: {
          raiderId,
          businessId: { in: businessIds },
        },
      });

      // 4.b) Aggiorna bussinesActived sul Raider (rimuovendo tutti i businessIds)
      const newActive = raider.bussinesActived.filter(
        (id) => !businessIds.includes(id)
      );
      await tx.raider.update({
        where: { id: raiderId },
        data: { bussinesActived: newActive },
      });

      // 4.c) Aggiorna raiderActived solo sui Business trovati
      await Promise.all(
        businesses.map((b) =>
          tx.business.update({
            where: { id: b.id },
            data: {
              raiderActived: b.raiderActived.filter(
                (rid) => rid !== raiderId
              ),
            },
          })
        )
      );
    });

    // 5) Risposta al client
    return NextResponse.json(
      {
        message: `Rimosse relazioni per ${businessIds.length} business` +
                 (missing.length ? `, ${missing.length} non trovati.` : "."),
        removedFromPivot: businessIds,
        missing: missing.length ? missing : undefined,
      },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore batch removal:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
