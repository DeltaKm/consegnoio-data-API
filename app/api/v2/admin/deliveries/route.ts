import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";
import { z } from "zod";
import { randomUUID } from "crypto";
import { sendNotification } from "@/app/lib/fcm";

enum StatusCodes {
  Success = 200,
  Created = 201,
  BadRequest = 400,
  Unauthorized = 401,
  NotFound = 404,
  InternalServerError = 500,
}

const createDeliverySchema = z.object({
  businessId: z.string(),
  orderId: z.string().optional(),
  schedulingDelivery: z.string(),
  customerId: z.string().optional(),
  customerName: z.string().min(1),
  customerSurname: z.string().min(1),
  deliveryAddress: z.string().min(1), // Indirizzo completo già formattato
  paymentType: z.string(),
  totalPaid: z.number(),
  totalShipping: z.number(),
  mobile: z.string().optional(),
  phone: z.string().optional(),
  note: z.string().optional(),
  customerCoordinates: z.string().optional(),
  deliveryType: z.string().optional(),
  numeroColli: z.number().optional(),
  details: z.array(
    z.object({
      id: z.string(),
      description: z.string(),
      quantity: z.number(),
      weight: z.number().optional(),
      price: z.number(),
      category: z.string(),
    })
  ).optional(),
  assignToRaiderId: z.string().optional(),
});

// GET - Vista globale ordini (Admin vede tutto)
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth) {
    return NextResponse.json(
      { message: "Non autorizzato. Accesso riservato agli Admin." },
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

    const where: any = {};

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

// POST - Crea ordine per un'attività qualsiasi (allineato a Logistics/Business,
// ma senza restrizione: l'Admin può creare per conto di qualunque attività,
// tipicamente per supporto/inserimento manuale).
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth) {
    return NextResponse.json(
      { message: "Non autorizzato. Accesso riservato agli Admin." },
      { status: StatusCodes.Unauthorized }
    );
  }

  try {
    const body = await request.json();

    const validation = createDeliverySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: "Dati non validi", errors: validation.error.errors },
        { status: StatusCodes.BadRequest }
      );
    }

    const data = validation.data;
    const assignToRaiderId = data.assignToRaiderId;

    const business = await prisma.business.findUnique({
      where: { id: data.businessId },
      include: { user: true },
    });

    if (!business) {
      return NextResponse.json(
        { message: "Business non trovato" },
        { status: StatusCodes.NotFound }
      );
    }

    let assignedRaider = null;
    if (assignToRaiderId) {
      assignedRaider = await prisma.raider.findUnique({
        where: { id: assignToRaiderId },
        select: { id: true, deviceTokens: true, bussinesActived: true },
      });

      if (!assignedRaider) {
        return NextResponse.json(
          { message: `Raider con ID ${assignToRaiderId} non trovato.` },
          { status: StatusCodes.NotFound }
        );
      }

      if (!assignedRaider.bussinesActived.includes(data.businessId)) {
        return NextResponse.json(
          { message: "Il raider selezionato non è abilitato per questo business." },
          { status: StatusCodes.BadRequest }
        );
      }
    }

    const businessName = business.bussinesName;
    const businessCoordinates = business.businessCord;
    const businessIMG = business.user?.imgUrl || "asset/images/icon-white.png";
    const pickupAddress = business.address;

    const recipient = `${data.customerName} ${data.customerSurname}`;
    const deliveryAddress = data.deliveryAddress;

    const schedulingDeliveryDate = new Date(data.schedulingDelivery);

    const numeroColli = data.numeroColli ||
      data.details?.reduce((sum, detail) => sum + detail.quantity, 0) ||
      1;

    const randomDistance = Math.floor(Math.random() * 10) + 1;
    const totalDistanceGenerated = `${randomDistance} KM`;

    const deliveryData: any = {
      name: businessName,
      businessCoordinates: businessCoordinates,
      orderId: data.orderId || `ORD-${randomUUID().split('-')[0].toUpperCase()}`,
      businessIMG,
      pickupAddress,
      schedulingDelivery: schedulingDeliveryDate,
      recipient,
      totalDistance: totalDistanceGenerated,
      deliveryAddress,
      totalPaid: data.totalPaid,
      mobile: data.mobile || "",
      phone: data.phone || "",
      compensation: data.totalShipping,
      note: data.note || "",
      customerCoordinates: data.customerCoordinates || "",
      numeroColli,
      paymentType: data.paymentType,
      deliveryType: data.deliveryType || "Generico",
      customerAddressDetails: deliveryAddress,
      business: {
        connect: { id: data.businessId },
      },
    };

    if (assignedRaider) {
      deliveryData.isAssigned = true;
      deliveryData.status = 'ASSIGNED';
      deliveryData.assignedToRaider = {
        connect: { id: assignedRaider.id },
      };
    }

    const newDelivery = await prisma.deliveryEA.create({
      data: deliveryData,
    });

    if (assignedRaider) {
      await prisma.assignedDelivery.create({
        data: {
          deliveryId: newDelivery.id,
          raiderId: assignedRaider.id,
        },
      });

      if (assignedRaider.deviceTokens && assignedRaider.deviceTokens.length > 0) {
        try {
          const formattedTime = schedulingDeliveryDate.toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit',
          });

          await sendNotification(
            assignedRaider.id,
            assignedRaider.deviceTokens,
            "Nuova consegna assegnata",
            `${businessName} - Orario: ${formattedTime}`,
            {
              type: "assigned_delivery",
              deliveryId: newDelivery.id,
              businessName: businessName,
              scheduledTime: formattedTime,
            }
          );
        } catch (notificationError) {
          console.error("Errore notifica:", notificationError);
        }
      }
    } else {
      const eligibleRaiders = await prisma.raider.findMany({
        where: {
          isActive: true,
          inService: true,
          id: { in: business.raiderActived },
        },
        select: {
          id: true,
          deviceTokens: true,
        },
      });

      for (const raider of eligibleRaiders) {
        if (raider.deviceTokens && raider.deviceTokens.length > 0) {
          try {
            const formattedTime = schedulingDeliveryDate.toLocaleTimeString('it-IT', {
              hour: '2-digit',
              minute: '2-digit',
            });

            await sendNotification(
              raider.id,
              raider.deviceTokens,
              "Nuova consegna disponibile",
              `${businessName} - Orario: ${formattedTime}`,
              {
                type: "new_delivery",
                deliveryId: newDelivery.id,
                businessName: businessName,
                scheduledTime: formattedTime,
              }
            );
          } catch (notificationError) {
            console.error("Errore notifica raider:", notificationError);
          }
        }
      }
    }

    return NextResponse.json({ delivery: newDelivery }, { status: StatusCodes.Created });
  } catch (error: any) {
    console.error("Errore creazione delivery:", error);
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
