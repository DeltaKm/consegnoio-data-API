import prisma from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

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
  
    const businessIMG = business.user?.imgUrl || null;

    const pickupAddress = business.address;

    const recipient = `${customerName} ${customerSurname}`;

    const deliveryAddress = `${customerAddress}, ${customerZipcode}, ${customerProvince}, ${customerCity}`;
    const customerAddressDetails = deliveryAddress;

    const schedulingDeliveryDate = new Date(schedulingDelivery);

    const numeroColli = details.reduce((sum, detail) => sum + detail.quantity, 0);

    const randomDistance = Math.floor(Math.random() * 10) + 1;
    const totalDistanceGenerated = `${randomDistance} KM`;

    const newDelivery = await prisma.testDeliveryEA.create({
      data: {
        name: businessName,
        businessId: businessId,
        orderId: orderId,
        businessIMG,         
        pickupAddress,        
        schedulingDelivery: schedulingDeliveryDate,
        recipient,
        totalDistance: totalDistanceGenerated,
        deliveryAddress,
        totalPaid,
        compensation: totalShipping,
        note,
        customerCoordinates,
        numeroColli,
        paymentType,
        customerAddressDetails,
      },
    });

    return NextResponse.json(
      { result: "success", delivery: newDelivery },
      { status: StatusCodes.Success }
    );
  } catch (error: any) {
    console.error("Error creating testDeliveryEA:", error);
    return NextResponse.json(
      { message: "Internal error during creation", error: error.message },
      { status: StatusCodes.InternalServerError }
    );
  }
}
