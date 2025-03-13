import { z } from "zod";


const alertMin = "La lunghezza deve essere di almeno caratteri ";
const alertMax = "La lunghezza massima non deve superare caratteri ";

export const testDeliverySchema = z.object({
  name: z.string().min(1, alertMin + "1").max(30, alertMax + "30"),
  pickupAddress: z.string().min(1),
  deliveryAddress: z.string().min(1),
  totalDistance: z.string().min(1),
  deliveryType: z.string().min(1),
  peso: z.number(),
  numeroColli: z.number(),
  compensation: z.number(),
  note: z.string(),
  schedulingDelivery: z.string().optional(),
  status: z.enum([
    "CREATED",
    "RELEASED",
    "ASSIGNED",
    "ONDELIVERY",
    "COMPLETED",
    "NOTDELIVERED",
    "DELETED"
  ]).optional(),
  isAssigned: z.boolean(),
  isCompleted: z.boolean(),
}).partial();

// schema di test per gli enum mapapti da me tramite zod
export const testSchema = z.object({  
    enum: z.enum([
      "CREATED",
      "ASSIGNED",
      "ONDELIVERY",
      "COMPLETED",
      "NOTDELIVERED",
      "DELETED"
    ]).optional(),
    field: z.string().optional(),
    scheduling: z.string().optional(),   
});


export const testDeliveryEASchema = z.object({
  name: z.string().optional(), // business name
  businessIMG: z.string().optional(),
  pickupAddress: z.string().optional(),
  deliveryAddress: z.string().optional(),
  customerCoordinates: z.string().optional(),
  customerAddressDetails: z.string().optional(),
  recipient: z.string().optional(),
  totalDistance: z.string().optional(),
  deliveryType: z.string().default("Alimenti").optional(),
  numeroColli: z.number().optional(),
  totalPaid: z.number({ required_error: "totalPaid is required" }),
  compensation: z.number({ required_error: "compensation is required" }),
  paymentType: z.string({ required_error: "paymentType is required" }),
  note: z.string().default("").optional(),
  schedulingDelivery: z.preprocess(
    (arg) => (typeof arg === "string" ? new Date(arg) : arg),
    z.date()
  ).optional(),
  status: z.string().default("CREATED").optional(),
  isAssigned: z.boolean().default(false).optional(),
  isCompleted: z.boolean().default(false).optional(),
  createdAt: z.preprocess(
    (arg) => (typeof arg === "string" ? new Date(arg) : arg),
    z.date()
  ).optional(),
  updateAt: z.preprocess(
    (arg) => (typeof arg === "string" ? new Date(arg) : arg),
    z.date()
  ).optional(),
});

export type TestDeliveryEASchema = z.infer<typeof testDeliveryEASchema>
export type TestSchema =z.infer<typeof testSchema>
export type TestDeliverySchema = z.infer<typeof testDeliverySchema>;

export const schemas = {
  testDeliverySchema,
  testSchema,
  testDeliveryEASchema
};
