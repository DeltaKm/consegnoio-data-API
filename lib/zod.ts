import { z } from "zod"

const alertMin = "La lunghezza deve essere di almeno caratteri "
const alertMax = "La lunghezza massima non deve superare caratteri "

// Validazione input utente
export const userSchema = z.object({
    idSlug: z.string().min(8, alertMin + "8").max(8, alertMax + "8"),
    email: z.string()
    .min(1, { message: "Questo capodo deve essere riempito" })
    .email("Email non valida")
    .refine((e) => e === "[email protetta]", "Questa email non è nel database"),
    usernname: z.string().min(5, alertMin + "5").max(10, alertMax + "10"),
    password: z.string().min(8, alertMin + "8").max(16, alertMax + "16"),
});

export const anagraficaUserType = z.object({
    nome: z.string().min(8, alertMin + "8").max(8, alertMax + "8"),
    cognome: z.string().min(8, alertMin + "8").max(8, alertMax + "8"),
    tel: z.string().min(8, alertMin + "8").max(8, alertMax + "20"),
});

export const cordTypeSchema = z.object({
    lat: z.number().finite(),
    long: z.number().finite(),
});

export const datiFiscaliSchema = z.object({
    codiceFiscale: z.string().min(16, alertMin + "16").max(16, alertMax + "16"),
    ragioneScociale: z.string().min(8, alertMin + "1").max(8, alertMax + "30"),
    partitaIVA: z.string().min(11, alertMin + "11").max(11, alertMax + "28"),
    codiceSDI: z.string().min(7, alertMin + "7").max(7, alertMax + "7"),
    pec: z.string()
    .min(1, { message: "Questo capodo deve essere riempito" })
    .email("Email non valida")
    .refine((e) => e === "[email protetta]", "Questa email non è nel database"),
});

export const indirizzoType = z.object({
    via: z.string().min(2, alertMin + "2").max(30, alertMax + "30"),
    numeroCivico: z.string().min(1, alertMin + "1").max(5, alertMax + "5"),
    provincia: z.string().min(2, alertMin + "2").max(12, alertMax + "12"),
    provinciaSigla: z.string().min(2, alertMin + "2").max(16, alertMax + "2"),
    citta: z.string().min(2, alertMin + "2").max(14, alertMax + "14"),
    cap: z.number().min(5, alertMin + "5").max(5, alertMax + "5"),
});


export type AnagraficaUserType = z.infer<typeof anagraficaUserType>;
export type UserSchema = z.infer<typeof userSchema>;

export const schemas = {
    userSchema,
    anagraficaUserType,
};