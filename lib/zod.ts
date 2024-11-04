import { z } from "zod"


export const listSchema = z.object({
    title: z.string().min(1, "Titolo richiesto").max(100, "Il titolo non deve superare i 100 caratteri"),

    description: z.string().max(500, "La descrizione non deve superare i 500 caratteri").optional(),

    isCompleted: z.boolean().default(false),
});

export type ListSchema = z.infer<typeof listSchema>;