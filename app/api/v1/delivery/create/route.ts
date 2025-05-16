import prisma from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { number, z } from "zod";
import { sendNotification } from "@/app/lib/fcm";

enum StatusCodes {
  BadRequest = 400,
  Success = 200,
  NotFound = 404,
  InternalServerError = 500,
}

const deliverySchema = z.object({
  businessId: z.string(),
  orderId: z.string(), 
  createdAt: z.string().optional(),
  schedulingDelivery: z.string(), 
  customerId: z.string(),
  customerName: z.string(),
  customerSurname: z.string(),
  customerAddress: z.string(),
  customerZipcode: z.string(),
  customerProvince: z.string(),
  customerCity: z.string(),
  paymentType: z.string(),
  totalPaid: z.number(),
  mobile: z.string(),
  phone: z.string(),
  totalShipping: z.number(),
  note: z.string(),
  customerCoordinates: z.string(),
  details: z.array(
    z.object({
      id: z.string(),
      description: z.string(),
      quantity: z.number(),
      weight: z.number(),
      price: z.number(),
      category: z.string(),
    })
  ),
});

export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text();
    if (!bodyText || bodyText.trim() === "") {
      return NextResponse.json(
        {
          message: "Missing fields. Example of payload:",
          example: {
            bussinesId: "ID_Business",
            orderId: "ID_ordine",
            schedulingDelivery: "2025-03-12 21:00:00",
            customerName: "Mario",
            customerSurname: "Rossi",
            customerAddress: "Via Gregorio D'alessandria",
            customerZipcode: "89900",
            customerProvince: "VV",
            customerCity: "Vibo Valentia",
            paymentType: "Contrassegno",
            totalPaid: 29.23,
            totalShipping: 5.23,
            note: "",
            customerCoordinates: "38.6748708,16.103075",
            details: [
              { id: "670383", description: "4 stagioni", quantity: 1, weight: 0, price: 8, category: "PIZZE ROSSE" },
              { id: "670385", description: "Alla norma", quantity: 1, weight: 0, price: 8, category: "PIZZE ROSSE" },
              { id: "670386", description: "Bufalina", quantity: 1, weight: 0, price: 8, category: "PIZZE ROSSE" }
            ]
          },
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

    const {
      businessId,
      orderId,
      schedulingDelivery,
      customerName,
      customerSurname,
      customerAddress,
      customerZipcode,
      customerProvince,
      customerCity,
      paymentType,
      totalPaid,
      mobile,
      phone,
      totalShipping,
      note,
      customerCoordinates,
      details,
    } = parsed.data;

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: { user: true },
    });
    if (!business) {
      return NextResponse.json(
        { message: "Business not found." },
        { status: StatusCodes.NotFound }
      );
    }

    const businessName = business.bussinesName;
    const businessCoordinates =business.businessCord;
  
    // Assicuriamoci che businessIMG abbia sempre un valore valido
    const businessIMG = business.user?.imgUrl || "asset/images/icon-white.png";

    const pickupAddress = business.address;

    const recipient = `${customerName} ${customerSurname}`;

    const deliveryAddress = `${customerAddress}, ${customerZipcode}, ${customerProvince}, ${customerCity}`;
    const customerAddressDetails = deliveryAddress;

    const schedulingDeliveryDate = new Date(schedulingDelivery);

    const numeroColli = details.reduce((sum, detail) => sum + detail.quantity, 0);

    const randomDistance = Math.floor(Math.random() * 10) + 1;
    const totalDistanceGenerated = `${randomDistance} KM`;

    const newDelivery = await prisma.deliveryEA.create({
      data: {
        name: businessName,
        businessCoordinates: businessCoordinates,
        businessId: businessId,
        orderId: orderId,
        businessIMG,         
        pickupAddress,        
        schedulingDelivery: schedulingDeliveryDate,
        recipient,
        totalDistance: totalDistanceGenerated,
        deliveryAddress,
        totalPaid,
        mobile,
        phone,
        compensation: totalShipping,
        note,
        customerCoordinates,
        numeroColli,
        paymentType,
        customerAddressDetails,
      },
    });

    // Trova i rider che dovrebbero ricevere la notifica
    // In questo esempio, notifichiamo tutti i rider attivi
    // In un'implementazione più avanzata, potresti filtrare per zona, disponibilità, ecc.
    try {
      const eligibleRaiders = await prisma.raider.findMany({
        where: {
          isActive: true,
          inService: true,
          // Se il business ha raider abilitati, notifica solo quelli
          ...(business.raiderActived && business.raiderActived.length > 0
            ? { id: { in: business.raiderActived } }
            : {}),
        },
        select: {
          id: true,
          deviceTokens: true,
        },
      });

      // Invia notifiche a tutti i rider idonei
      for (const raider of eligibleRaiders) {
        if (raider.deviceTokens && raider.deviceTokens.length > 0) {
          try {
            // Formatta la data di consegna in un formato leggibile
            const schedulingTime = schedulingDeliveryDate ? new Date(schedulingDeliveryDate) : new Date();
            const formattedDate = schedulingTime.toLocaleDateString('it-IT', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            });
            const formattedTime = schedulingTime.toLocaleTimeString('it-IT', {
              hour: '2-digit',
              minute: '2-digit'
            });
            const fullFormattedDate = `${formattedDate} ${formattedTime}`;
            
            await sendNotification(
              raider.id,
              raider.deviceTokens,
              "Nuova consegna disponibile",
              `${businessName} - Data: ${fullFormattedDate}`,
              {
                type: "new_delivery",
                deliveryId: newDelivery.id,
                businessName: businessName || "",
                scheduledTime: formattedTime,
                // Rimuoviamo gli indirizzi come richiesto
              }
            );
          } catch (notificationError) {
            console.error(`Errore nell'invio della notifica al rider ${raider.id}:`, notificationError);
            // Continuiamo con gli altri rider anche se fallisce la notifica per uno
          }
        }
      }
    } catch (notificationError) {
      console.error("Errore durante l'invio delle notifiche:", notificationError);
      // Continuiamo anche se fallisce l'invio delle notifiche
    }

    return NextResponse.json(
      { result: "success", delivery: newDelivery },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Error creating DeliveryEA:", error);
    return NextResponse.json(
      { message: "Internal error during creation", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
