import { string, z } from "zod"

const messageMin = "La lunghezza deve essere di almeno caratteri "
const messageMax = "La lunghezza massima non deve superare caratteri "


export const userSchema = z.object({
    idSlug: z.string().min(8,messageMin + "8").max(8, messageMax + "8"),
    email: z.string()
    .min(1, { message: "Questo capodo deve essere riempito" })
    .email("Email non valida")
    .refine((e) => e === "[email protetta]", "Questa email non è nel database"),
    usernname: z.string().min(8,messageMin + "8").max(8, messageMax + "8"),
    password: z.string().min(8,messageMin + "8").max(8, messageMax + "8"),
});

export type UserSchema = z.infer<typeof userSchema>;
