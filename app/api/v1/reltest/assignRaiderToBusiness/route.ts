// // app/api/v1/reltest/assignRaiderToBusiness/route.ts
// import prisma from "@/app/lib/prisma";
// import { NextRequest, NextResponse } from "next/server";

// enum StatusCodes {
//   NotFound = 404,
//   Success = 200,
//   Created = 201,
//   BadRequest = 400,
//   InternalServerError = 500,
// }

// export async function POST(request: NextRequest) {
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


//     const raider = await prisma.raider.findUnique({
//       where: { id: raiderId },
//     });
//     if (!raider) {
//       return NextResponse.json(
//         { message: "Raider not found" },
//         { status: StatusCodes.NotFound }
//       );
//     }

   
//     const business = await prisma.business.findUnique({
//       where: { id: businessId },
//     });
//     if (!business) {
//       return NextResponse.json(
//         { message: "Business not found" },
//         { status: StatusCodes.NotFound }
//       );
//     }


//     const existingRelation = await prisma.businessRaider.findFirst({
//       where: { raiderId, businessId },
//     });
//     if (existingRelation) {
//       return NextResponse.json(
//         { message: "Raider already assigned to the business.", relation: existingRelation },
//         { status: StatusCodes.BadRequest }
//       );
//     }


//     const relation = await prisma.businessRaider.create({
//       data: {
//         raiderId,
//         businessId,
//         confirmedFromBusiness: false,
//       },
//     });

    
//     let updatedRaider = raider;
//     if (!raider.bussinesActived.includes(businessId)) {
//       const newActives = [...raider.bussinesActived, businessId];
//       updatedRaider = await prisma.raider.update({
//         where: { id: raiderId },
//         data: { bussinesActived: newActives },
//       });
//     }

   
//     let updatedBusiness = business;
//     if (!business.raiderActived.includes(raiderId)) {
//       const newRaiders = [...business.raiderActived, raiderId];
//       updatedBusiness = await prisma.business.update({
//         where: { id: businessId },
//         data: { raiderActived: newRaiders },
//       });
//     }

//     return NextResponse.json(
//       {
//         message: "Raider assigned to the business successfully.",
//         relation,
//         updatedRaider,
//         updatedBusiness,
//       },
//       { status: StatusCodes.Created }
//     );
//   } catch (error: any) {
//     console.error("Error during raider assignment to business:", error);
//     return NextResponse.json(
//       { message: "Internal error during assignment", error: error.message },
//       { status: StatusCodes.InternalServerError }
//     );
//   }
// }


// app/api/v1/reltest/assignRaiderToBusiness/route.ts
import prisma from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

enum StatusCodes {
  BadRequest = 400,
  Success    = 200,
  Created    = 201,
  NotFound   = 404,
  Internal   = 500,
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { raiderId, businessIds } = body;

    if (!raiderId || !Array.isArray(businessIds) || businessIds.length === 0) {
      return NextResponse.json(
        { message: "Devi passare raiderId e un array non vuoto di businessIds" },
        { status: StatusCodes.BadRequest }
      );
    }

    // Verifico che il raider esista
    const raider = await prisma.raider.findUnique({ where: { id: raiderId } });
    if (!raider) {
      return NextResponse.json({ message: "Raider non trovato" }, { status: StatusCodes.NotFound });
    }

    // Verifico che tutti i business esistano
    const businesses = await prisma.business.findMany({
      where: { id: { in: businessIds } },
      select: { id: true, raiderActived: true },
    });
    const foundIds = businesses.map(b => b.id);
    const missing = businessIds.filter(id => !foundIds.includes(id));
    if (missing.length) {
      return NextResponse.json(
        { message: "Business non trovati", missing },
        { status: StatusCodes.NotFound }
      );
    }

    // Eseguo tutto in transazione per atomicità
    const results = await prisma.$transaction(async tx => {
      // 1) Creo le relazioni in batch
      const createRels = businessIds.map(bizId =>
        tx.businessRaider.upsert({
          where: { businessId_raiderId: { businessId: bizId, raiderId } },
          update: {},
          create: { businessId: bizId, raiderId, confirmedFromBusiness: false },
        })
      );

      await Promise.all(createRels);

      // 2) Aggiorno l'array bussinesActived del Raider
      const newActives = Array.from(new Set([
        ...raider.bussinesActived,
        ...businessIds
      ]));
      await tx.raider.update({
        where: { id: raiderId },
        data: { bussinesActived: newActives },
      });

      // 3) Aggiorno gli array raiderActived sui Business
      const updateBiz = businesses.map(b =>
        tx.business.update({
          where: { id: b.id },
          data: {
            raiderActived: Array.from(new Set([
              ...b.raiderActived,
              raiderId
            ]))
          }
        })
      );
      await Promise.all(updateBiz);

      return { updatedRaider: newActives, updatedBusinesses: businessIds };
    });

    return NextResponse.json(
      {
        message: `Raider ${raiderId} assegnato a ${businessIds.length} business.`,
        details: results,
      },
      { status: StatusCodes.Created }
    );

  } catch (error: any) {
    console.error("Errore batch assignment:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.Internal }
    );
  }
}
