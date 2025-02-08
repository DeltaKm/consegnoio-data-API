
import { preset } from "swr/_internal";
import { object, z } from "zod"


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
    isAssigned: z.boolean(),
    isCompleted: z.boolean(),
  }).partial(); 

export const raiderPersonalDataTypeSchema = z.object({
  name: z.string().min(1, alertMin + "1").max(30, alertMax + "30"),
  surname: z.string().min(1, alertMin + "1").max(30, alertMax + "30"),
  email: z.string().min(1, alertMin + "1").max(30, alertMax + "30"),
  birthDay: z.string().min(1, alertMin + "1").max(30, alertMax + "30"),
  businessId: z.string().min(1, alertMin + "1").max(30, alertMax + "30"),
  isActive: z.boolean(),
}).partial();

export const zonePrefernceTypeSchema = z.object({
  radiusKm: z.string().min(1, alertMin + "1").max(30, alertMax + "30"),
  distanceKm: z.string().min(1, alertMin + "1").max(30, alertMax + "30"),
}).partial()

export const qrValidation = z.object({
  validation: z.string().min(1, alertMin + "1").max(30, alertMax + "30"),
  config: z.string().min(1, alertMin + "1").max(30, alertMax + "30"),
  presetMultiDelivery: z.string().min(1, alertMin + "1").max(30, alertMax + "30"),
  postiionVal: z.string().min(1, alertMin + "1").max(30, alertMax + "30"),
}).partial();

export type TestDeliverySchema = z.infer <typeof testDeliverySchema>;
export type RaiderPersonalDataTypeSchema = z.infer <typeof raiderPersonalDataTypeSchema>;
export type ZonePrefernceTypeSchema = z.infer <typeof zonePrefernceTypeSchema>;
export type QrValidation = z.infer <typeof qrValidation>;

export const schemas = {    
    testDeliverySchema,
    raiderPersonalDataTypeSchema,
    zonePrefernceTypeSchema,
    qrValidation,
};