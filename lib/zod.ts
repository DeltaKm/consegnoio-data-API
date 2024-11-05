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




export type AnagraficaRaiderType = z.infer<typeof anagraficaUserType>;
export type UserSchema = z.infer<typeof userSchema>;
