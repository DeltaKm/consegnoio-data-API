// // app/api/v1/reltest/updateConfirmedFromBusiness/route.ts
// import prisma from "@/app/lib/prisma";
// import { NextRequest, NextResponse } from "next/server";

// enum StatusCodes {
//   BadRequest = 400,
//   Success = 200,
//   NotFound = 404,
//   InternalServerError = 500,
// }

// export async function PATCH(request: NextRequest) {
//   try {
//     const relationId = request.nextUrl.searchParams.get("relationId");
//     const valueParam = request.nextUrl.searchParams.get("value");

//     if (!relationId || valueParam === null) {
//       return NextResponse.json(
//         {
//           message: "Missing query parameters. Example: ?relationId=RELATION_ID&value=true",
//         },
//         { status: StatusCodes.BadRequest }
//       );
//     }

//     let newValue: boolean;
//     if (valueParam.toLowerCase() === "true") {
//       newValue = true;
//     } else if (valueParam.toLowerCase() === "false") {
//       newValue = false;
//     } else {
//       return NextResponse.json(
//         { message: "Invalid value parameter. Use true or false." },
//         { status: StatusCodes.BadRequest }
//       );
//     }
//     const existingRelation = await prisma.businessRaider.findUnique({
//       where: { id: relationId },
//     });
//     if (!existingRelation) {
//       return NextResponse.json(
//         { message: "Relation not found." },
//         { status: StatusCodes.NotFound }
//       );
//     }

//     const updatedRelation = await prisma.businessRaider.update({
//       where: { id: relationId },
//       data: { confirmedFromBusiness: newValue },
//     });

//     return NextResponse.json(
//       { message: "Relation updated successfully.", updatedRelation },
//       { status: StatusCodes.Success }
//     );
//   } catch (error: any) {
//     console.error("Error updating relation:", error);
//     return NextResponse.json(
//       { message: "Internal error", error: error.message },
//       { status: StatusCodes.InternalServerError }
//     );
//   }
// }


// app/api/v1/reltest/updateBusinessRelation/route.ts
import prisma from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

enum StatusCodes {
  BadRequest = 400,
  Success = 200,
  NotFound = 404,
  InternalServerError = 500,
}

export async function PATCH(request: NextRequest) {
  try {
    const { raiderId, businessIds, value } = await request.json();

    // 1) Validazione payload
    if (
      !raiderId ||
      !Array.isArray(businessIds) || businessIds.length === 0 ||
      typeof value !== 'boolean'
    ) {
      return NextResponse.json(
        { message: "Devi passare 'raiderId', un array 'businessIds' non vuoto e un boolean 'value'" },
        { status: StatusCodes.BadRequest }
      );
    }

    // 2) Verifica che il Raider esista
    const raider = await prisma.raider.findUnique({ where: { id: raiderId } });
    if (!raider) {
      return NextResponse.json(
        { message: "Raider non trovato" },
        { status: StatusCodes.BadRequest }
      );
    }

    // 3) Recupera le relazioni esistenti per questo raider e i business specificati
    const existing = await prisma.businessRaider.findMany({
      where: {
        raiderId,
        businessId: { in: businessIds }
      },
      select: { id: true, businessId: true }
    });
    const foundRelationIds = existing.map(r => r.id);
    const existingBusinessIds = existing.map(r => r.businessId);
    const missingBiz = businessIds.filter(bid => !existingBusinessIds.includes(bid));

    // 4) Se non c'è nulla da aggiornare
    if (foundRelationIds.length === 0) {
      return NextResponse.json(
        { message: "Nessuna relazione trovata da aggiornare", missingBiz },
        { status: StatusCodes.NotFound }
      );
    }

    // 5) Aggiorna in batch
    await prisma.businessRaider.updateMany({
      where: { id: { in: foundRelationIds } },
      data: { confirmedFromBusiness: value },
    });

    // 6) Recupera le relazioni aggiornate
    const updatedRelations = await prisma.businessRaider.findMany({
      where: { id: { in: foundRelationIds } },
    });

    // 7) Risposta
    return NextResponse.json(
      {
        message: `Aggiornate ${foundRelationIds.length} relazioni.`,
        updated: updatedRelations,
        missingBiz: missingBiz.length ? missingBiz : undefined
      },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Error updating business relations:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
