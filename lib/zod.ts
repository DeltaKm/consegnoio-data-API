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
// da eseguire il merge dell' anagraficaType
export const anagraficaRaiderType = z.object({
    nome: z.string().min(8, alertMin + "8").max(8, alertMax + "8"),
    cognome: z.string().min(8, alertMin + "8").max(8, alertMax + "8"),
    dataNascita: z.number(),
    codiceFiscale: z.string().min(16, alertMin + "16").max(16, alertMax + "16"),
    via: z.string().min(8, alertMin + "8").max(25, alertMax + "25"),
    provincia: z.string().min(8, alertMin + "8").max(8, alertMax + "8"),
    citta: z.string().min(8, alertMin + "8").max(8, alertMax + "8"),
    cap: z.string().min(8, alertMin + "8").max(8, alertMax + "8"),
    tel: z.string().min(8, alertMin + "8").max(8, alertMax + "8"),
});

export const anagraficaContractorType = z.object({
    nome: z.string().min(8, alertMin + "8").max(8, alertMax + "8"),
    cognome: z.string().min(8, alertMin + "8").max(8, alertMax + "8"),
    dataNascita: z.number(),
    codiceFiscale: z.string().min(16, alertMin + "16").max(16, alertMax + "16"),
    via: z.string().min(8, alertMin + "8").max(25, alertMax + "25"),
    provincia: z.string().min(8, alertMin + "8").max(8, alertMax + "8"),
    citta: z.string().min(8, alertMin + "8").max(8, alertMax + "8"),
    cap: z.string().min(8, alertMin + "8").max(8, alertMax + "8"),
    tel: z.string().min(8, alertMin + "8").max(8, alertMax + "8"),
});


export type AnagraficaRaiderType = z.infer<typeof anagraficaRaiderType>;
export type AnagraficaContractorType = z.infer<typeof anagraficaContractorType>;
export type UserSchema = z.infer<typeof userSchema>;
