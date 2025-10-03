import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireBusiness } from "@/app/lib/auth";

enum StatusCodes {
  Success = 200,
  Unauthorized = 401,
  InternalServerError = 500,
}

// GET - Lista richieste di abilitazione pending
export async function GET(request: NextRequest) {
  const auth = await requireBusiness(request);
  if (!auth) {
    return NextResponse.json(
      { message: "Non autorizzato. Accesso riservato ai Business." },
      { status: StatusCodes.Unauthorized }
    );
  }

  try {
    const pendingRequests = await prisma.businessRaider.findMany({
      where: {
        businessId: auth.business.id,
        confirmedFromBusiness: false,
      },
      include: {
        raider: {
          include: {
            user: {
              select: {
                email: true,
                imgUrl: true,
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const requests = pendingRequests.map(req => ({
      relationId: req.id,
      raiderId: req.raider.id,
      name: req.raider.name,
      surname: req.raider.surname,
      vehicle: req.raider.vehicle,
      email: req.raider.user?.email,
      imgUrl: req.raider.user?.imgUrl,
      requestedAt: req.createdAt,
    }));

    return NextResponse.json(
      { 
        count: requests.length,
        requests 
      },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore recupero richieste pending:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
