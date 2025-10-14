import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireBusiness } from "@/app/lib/auth";
import { z } from "zod";
import { sendNotification } from "@/app/lib/fcm";
import { randomUUID } from "crypto";

enum StatusCodes {
  Success = 200,
  Created = 201,
  BadRequest = 400,
  Unauthorized = 401,
  NotFound = 404,
  InternalServerError = 500,
}

const deliverySchema = z.object({
  orderId: z.string().optional(),
  schedulingDelivery: z.string(),
  customerId: z.string().optional(),
  customerName: z.string(),
  customerSurname: z.string(),
  customerAddress: z.string(),
  customerZipcode: z.string().optional(),
  customerProvince: z.string().optional(),
  customerCity: z.string().optional(),
  paymentType: z.string(),
  totalPaid: z.number(),
  mobile: z.string().optional(),
  phone: z.string().optional(),
  totalShipping: z.number(),
  note: z.string().optional(),
  customerCoordinates: z.string().optional(),
  deliveryType: z.string().optional(), // Categoria: "Alimenti", "Farmaci", etc.
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

// GET - Lista ordini del business
export async function GET(request: NextRequest) {
  const auth = await requireBusiness(request);
  if (!auth) {
    return NextResponse.json(
      { message: "Non autorizzato. Accesso riservato ai Business." },
      { status: StatusCodes.Unauthorized }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const raiderId = searchParams.get("raiderId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: any = {
      businessId: auth.business.id,
    };

    if (status) {
      where.status = status;
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

// POST - Crea nuovo ordine
export async function POST(request: NextRequest) {
  const auth = await requireBusiness(request);
  if (!auth) {
    return NextResponse.json(
      { message: "Non autorizzato. Accesso riservato ai Business." },
      { status: StatusCodes.Unauthorized }
    );
  }

  try {
    const bodyText = await request.text();
    if (!bodyText || bodyText.trim() === "") {
      return NextResponse.json(
        {
          message: "Campi mancanti",
          example: {
            orderId: "ORD-123",
            schedulingDelivery: "2025-03-12 21:00:00",
            customerName: "Mario",
            customerSurname: "Rossi",
            customerAddress: "Via Example 123, 00100 Roma",
            paymentType: "Contrassegno",
            totalPaid: 29.23,
            totalShipping: 5.23,
            mobile: "3331234567",
            note: "",
            customerCoordinates: "41.9028,12.4964",
            assignToRaiderId: "optional_raider_id"
          }
        },
        { status: StatusCodes.BadRequest }
      );
    }

    const parsed = deliverySchema.safeParse(JSON.parse(bodyText));
    if (!parsed.success) {
      const errorMessage = parsed.error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      return NextResponse.json({ message: errorMessage }, { status: StatusCodes.BadRequest });
    }

    const data = parsed.data;
    const assignToRaiderId = data.assignToRaiderId;

    // Verifica raider se specificato
    let assignedRaider = null;
    if (assignToRaiderId) {
      assignedRaider = await prisma.raider.findUnique({
        where: { id: assignToRaiderId },
        select: { id: true, deviceTokens: true }
      });

      if (!assignedRaider) {
        return NextResponse.json(
          { message: `Raider con ID ${assignToRaiderId} non trovato.` },
          { status: StatusCodes.NotFound }
        );
      }

      // Verifica che il raider sia abilitato per questo business
      if (!auth.business.raiderActived.includes(assignToRaiderId)) {
        return NextResponse.json(
          { message: "Il raider selezionato non è abilitato per questo business." },
          { status: StatusCodes.BadRequest }
        );
      }
    }

    const businessName = auth.business.bussinesName;
    const businessCoordinates = auth.business.businessCord;
    const businessIMG = auth.user.imgUrl || "asset/images/icon-white.png";
    const pickupAddress = auth.business.address;

    const recipient = `${data.customerName} ${data.customerSurname}`;
    const deliveryAddress = data.customerZipcode && data.customerProvince && data.customerCity
      ? `${data.customerAddress}, ${data.customerZipcode}, ${data.customerProvince}, ${data.customerCity}`
      : data.customerAddress;

    const schedulingDeliveryDate = new Date(data.schedulingDelivery);
    const numeroColli = data.details?.reduce((sum, detail) => sum + detail.quantity, 0) || 1;

    // Calcolo distanza (placeholder - integrare con Google Maps API)
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
      deliveryType: data.deliveryType || "Generico", // Default se non specificato
      customerAddressDetails: deliveryAddress,
      business: {
        connect: { id: auth.business.id }
      }
    };

    // Se raider specificato, assegna direttamente
    if (assignedRaider) {
      deliveryData.isAssigned = true;
      deliveryData.status = 'ASSIGNED';
      deliveryData.assignedToRaider = {
        connect: { id: assignedRaider.id }
      };
    }

    const newDelivery = await prisma.deliveryEA.create({
      data: deliveryData,
    });

    // Crea record AssignedDelivery se assegnato
    if (assignedRaider) {
      await prisma.assignedDelivery.create({
        data: {
          deliveryId: newDelivery.id,
          raiderId: assignedRaider.id,
        },
      });

      // Notifica raider
      if (assignedRaider.deviceTokens && assignedRaider.deviceTokens.length > 0) {
        try {
          const formattedTime = schedulingDeliveryDate.toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit'
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
      // Notifica tutti i raider idonei
      const eligibleRaiders = await prisma.raider.findMany({
        where: {
          isActive: true,
          inService: true,
          id: { in: auth.business.raiderActived }
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
              minute: '2-digit'
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

    return NextResponse.json(
      {
        result: "success",
        message: "Ordine creato con successo",
        delivery: newDelivery,
        assigned: assignedRaider ? true : false,
        assignedTo: assignedRaider ? assignedRaider.id : null
      },
      { status: StatusCodes.Created }
    );
  } catch (error: any) {
    console.error("Errore creazione delivery:", error);
    return NextResponse.json(
      { message: "Errore interno durante la creazione", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
