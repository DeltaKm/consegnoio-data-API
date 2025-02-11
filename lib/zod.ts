
import { z } from "zod"


const alertMin = "La lunghezza deve essere di almeno caratteri "
const alertMax = "La lunghezza massima non deve superare caratteri "



export const testDeliverySchema = z.object({
    name: z.string().min(1, alertMin + "1").max(30, alertMax + "30"),
    pickupAddress: z.string().min(1),
    deliveryAddress: z.string().min(1),
    totalDistance: z.string().min(1),
    deliveryType: z.string().min(1),
    peso: z.number(),
    numeroColli: z.number(),
    compensation: z.number(),
    // isAssigned: z.boolean(),
    // isCompleted: z.boolean(),
  })

  
export type TestDeliverySchema = z.infer <typeof testDeliverySchema>;

export const schemas = {    
    testDeliverySchema,

};