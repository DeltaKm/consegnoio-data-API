
// // app/api/v1/reltest/assignRaiderToBusiness/route.ts
// import prisma from "@/app/lib/prisma";
// import { NextRequest, NextResponse } from "next/server";

// enum StatusCodes {
//   BadRequest = 400,
//   Success    = 200,
//   Created    = 201,
//   NotFound   = 404,
//   Internal   = 500,
// }

// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json();
//     const { raiderId, businessIds } = body;

//     if (!raiderId || !Array.isArray(businessIds) || businessIds.length === 0) {
//       return NextResponse.json(
//         { message: "Devi passare raiderId e un array non vuoto di businessIds" },
//         { status: StatusCodes.BadRequest }
//       );
//     }

//     // Verifico che il raider esista
//     const raider = await prisma.raider.findUnique({ where: { id: raiderId } });
//     if (!raider) {
//       return NextResponse.json({ message: "Raider non trovato" }, { status: StatusCodes.NotFound });
//     }

//     // Verifico che tutti i business esistano
//     const businesses = await prisma.business.findMany({
//       where: { id: { in: businessIds } },
//       select: { id: true, raiderActived: true },
//     });
//     const foundIds = businesses.map(b => b.id);
//     const missing = businessIds.filter(id => !foundIds.includes(id));
//     if (missing.length) {
//       return NextResponse.json(
//         { message: "Business non trovati", missing },
//         { status: StatusCodes.NotFound }
//       );
//     }

//     // Eseguo tutto in transazione per atomicità
//     const results = await prisma.$transaction(async tx => {
//       // 1) Creo le relazioni in batch
//       const createRels = businessIds.map(bizId =>
//         tx.businessRaider.upsert({
//           where: { businessId_raiderId: { businessId: bizId, raiderId } },
//           update: {},
//           create: { businessId: bizId, raiderId, confirmedFromBusiness: false },
//         })
//       );

//       await Promise.all(createRels);

//       // 2) Aggiorno l'array bussinesActived del Raider
//       const newActives = Array.from(new Set([
//         ...raider.bussinesActived,
//         ...businessIds
//       ]));
//       await tx.raider.update({
//         where: { id: raiderId },
//         data: { bussinesActived: newActives },
//       });

//       // 3) Aggiorno gli array raiderActived sui Business
//       const updateBiz = businesses.map(b =>
//         tx.business.update({
//           where: { id: b.id },
//           data: {
//             raiderActived: Array.from(new Set([
//               ...b.raiderActived,
//               raiderId
//             ]))
//           }
//         })
//       );
//       await Promise.all(updateBiz);

//       return { updatedRaider: newActives, updatedBusinesses: businessIds };
//     });

//     return NextResponse.json(
//       {
//         message: `Raider ${raiderId} assegnato a ${businessIds.length} business.`,
//         details: results,
//       },
//       { status: StatusCodes.Created }
//     );

//   } catch (error: any) {
//     console.error("Errore batch assignment:", error);
//     return NextResponse.json(
//       { message: "Errore interno", error: error.message },
//       { status: StatusCodes.Internal }
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

    // Eseguo tutto in transazione per atomicità (timeout aumentato a 10 secondi)
    const results = await prisma.$transaction(
      async tx => {
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
          ...businessIds,
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
                raiderId,
              ])),
            },
          })
        );
        await Promise.all(updateBiz);

        return { updatedRaider: newActives, updatedBusinesses: businessIds };
      },
      { timeout: 10_000 }
    );

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
