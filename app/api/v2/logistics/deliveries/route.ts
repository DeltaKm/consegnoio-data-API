import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireLogistics } from "@/app/lib/auth";
import { z } from "zod";

enum StatusCodes {
  Success = 200,
  Created = 201,
  BadRequest = 400,
  Unauthorized = 401,
  Forbidden = 403,
  InternalServerError = 500,
}

const createDeliverySchema = z.object({
  businessId: z.string(),
  orderId: z.string().optional(),
  schedulingDelivery: z.string(),
  customerName: z.string().min(1),
  customerSurname: z.string().min(1),
  customerAddress: z.string().min(1),
  paymentType: z.string(),
  totalPaid: z.number(),
  totalShipping: z.number().optional(),
  mobile: z.string().optional(),
  note: z.string().optional(),
  customerCoordinates: z.string().optional(),
});

// GET - Vista ordini dei business assegnati al logistics
export async function GET(request: NextRequest) {
  const auth = await requireLogistics(request);
  if (!auth) {
    return NextResponse.json(
      { message: "Non autorizzato. Accesso riservato a Logistics." },
      { status: StatusCodes.Unauthorized }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const businessId = searchParams.get("businessId");
    const raiderId = searchParams.get("raiderId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Ottieni IDs dei business assegnati
    const assignedBusinessIds = auth.logistics.businessRelations.map(rel => rel.businessId);

    const where: any = {
      businessId: { in: assignedBusinessIds } // ← FILTRA SOLO ORDINI DEI BUSINESS ASSEGNATI
    };

    if (status) {
      where.status = status;
    }

    if (businessId) {
      where.businessId = businessId;
    }

    if (raiderId) {
      where.assignedToRaiderId = raiderId;
    }

    if (dateFrom || dateTo) {
      where.schedulingDelivery = {};
      if (dateFrom) where.schedulingDelivery.gte = new Date(dateFrom);
      if (dateTo) where.schedulingDelivery.lte = new Date(dateTo);
    }

    const [deliveries, total] = await Promise.all([
      prisma.deliveryEA.findMany({
        where,
        include: {
          business: {
            select: {
              id: true,
              bussinesName: true,
            }
          },
          assignedToRaider: {
            select: {
              id: true,
              name: true,
              surname: true,
              vehicle: true,
            }
          }
        },
        orderBy: { schedulingDelivery: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.deliveryEA.count({ where }),
    ]);

    return NextResponse.json(
      {
        deliveries,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        }
      },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Errore recupero deliveries:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}

// POST - Crea ordine per uno dei business assegnati
export async function POST(request: NextRequest) {
  const auth = await requireLogistics(request);
  if (!auth) {
    return NextResponse.json(
      { message: "Non autorizzato. Accesso riservato a Logistics." },
      { status: StatusCodes.Unauthorized }
    );
  }

  try {
    const body = await request.json();

    // Validazione
    const validation = createDeliverySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: "Dati non validi", errors: validation.error.errors },
        { status: StatusCodes.BadRequest }
      );
    }

    const data = validation.data;

    // Verifica che businessId sia assegnato a questo logistics
    const assignedBusinessIds = auth.logistics.businessRelations.map(rel => rel.businessId);
    
    if (!assignedBusinessIds.includes(data.businessId)) {
      return NextResponse.json(
        { message: "Non hai accesso a questo business" },
        { status: StatusCodes.Forbidden }
      );
    }

    // Genera orderId se non fornito
    const orderId = data.orderId || `ORD-${Date.now()}`;

    // Crea ordine
    const delivery = await prisma.deliveryEA.create({
      data: {
        businessId: data.businessId,
        orderId,
        schedulingDelivery: new Date(data.schedulingDelivery),
        name: `${data.customerName} ${data.customerSurname}`,
        deliveryAddress: data.customerAddress,
        customerCoordinates: data.customerCoordinates,
        paymentType: data.paymentType,
        totalPaid: data.totalPaid,
        compensation: data.totalShipping || 0, // Usa compensation per shipping
        mobile: data.mobile,
        note: data.note || "",
        status: "CREATED",
        isAssigned: false,
        isCompleted: false,
      }
    });

    // Fetch business name separatamente
    const business = await prisma.business.findUnique({
      where: { id: data.businessId },
      select: { bussinesName: true }
    });

    return NextResponse.json(
      {
        message: "Ordine creato con successo",
        delivery: {
          id: delivery.id,
          orderId: delivery.orderId,
          businessName: business?.bussinesName,
          customerName: data.customerName,
          customerSurname: data.customerSurname,
          customerAddress: data.customerAddress,
          schedulingDelivery: delivery.schedulingDelivery,
          status: delivery.status,
        }
      },
      { status: StatusCodes.Created }
    );
  } catch (error: any) {
    console.error("Errore creazione ordine:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
