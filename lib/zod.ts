
// Index:
//  zVal objType    r13    
//  zVal dataModel  r66

import { z } from "zod"


const alertMin = "La lunghezza deve essere di almeno caratteri "
const alertMax = "La lunghezza massima non deve superare caratteri "


// ***** Inizio validazione objType *****
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


export const indirizzoTypeSchema = z.object({
    via: z.string().min(2, alertMin + "2").max(30, alertMax + "30"),
    numeroCivico: z.string().min(1, alertMin + "1").max(5, alertMax + "5"),
    provincia: z.string().min(2, alertMin + "2").max(12, alertMax + "12"),
    provinciaSigla: z.string().min(2, alertMin + "2").max(16, alertMax + "2"),
    citta: z.string().min(2, alertMin + "2").max(14, alertMax + "14"),
    cap: z.number().min(5, alertMin + "5").max(5, alertMax + "5"),
});


export const anagraficaUserTypeSchema = z.object({
    nome: z.string().min(8, alertMin + "8").max(8, alertMax + "8"),
    cognome: z.string().min(8, alertMin + "8").max(8, alertMax + "8"),
    tel: z.string().min(8, alertMin + "8").max(8, alertMax + "20"),
});

export const costoTypeSchema = z. object({
    pagamentoAllaConsegna: z.boolean(),
    quota: z.number().min(1, alertMin + "1").max(20, alertMax + "20"),
});


export const datiMerceTypeSchema = z.object({
    nome: z.string().min(1, alertMin + "5").max(5, alertMax + "30"),
    peso: z.number().min(1, alertMin + "1").max(20, alertMax + "20"),
    altezza: z.number().min(1, alertMin + "1").max(20, alertMax + "20"),
    larghezza: z.number().min(1, alertMin + "1").max(20, alertMax + "20"),
    lunghezza: z.number().min(1, alertMin + "1").max(20, alertMax + "20"),
    densita: z.number().min(1, alertMin + "1").max(20, alertMax + "20"),
    pesoVolumetico: z.number().min(1, alertMin + "1").max(20, alertMax + "20"),
});
// ***** Fine validazione objType *****



// ***** Inizio validazione dataModel *****
export const userSchema = z.object({
    idSlug: z.string().min(8, alertMin + "8").max(8, alertMax + "8"),
    email: z.string()
    .min(1, { message: "Questo capodo deve essere riempito" })
    .email("Email non valida")
    .refine((e) => e === "[email protetta]", "Questa email non è nel database"),
    usernname: z.string().min(5, alertMin + "5").max(10, alertMax + "10"),
    password: z.string().min(8, alertMin + "8").max(16, alertMax + "16"),
});

export const orderSchema = z.object({
    hashQrFirma: z.string().min(8, alertMin + "8").max(8, alertMax + "8"),
    dataOreRitiroPrevisto: z.date(),
    dataOreConsegnaPrevista: z.date(),
    note: z.string().min(8, alertMin + "8").max(8, alertMax + "8"),
    quotaRider: z.string().min(8, alertMin + "8").max(8, alertMax + "8"),
    isActive: z.boolean(),
});

export const deliverySchema = z.object({
    daraOraRitiroReale: z.date(),
    dataOraRitiroReale: z .date(),    
});

export const comuniSchema = z.object({
    codiceIstat: z.number().min(5, alertMin + "5").max(5, alertMax + "5"),
    denominazioneIta: z.string().min(2, alertMin + "2").max(8, alertMax + "20"),
    cap: z.number().min(5, alertMin + "5").max(5, alertMax + "5"),
    siglaProvincia: z.number().min(2, alertMin + "2").max(2, alertMax + "2"),
    denominazioneProvincia: z.number().min(2, alertMin + "2").max(20, alertMax + "20"),
    denominazioneRegione: z.number().min(2, alertMin + "2").max(20, alertMax + "20"),
});

export const nazioniSchema = z.object({
   siglaNazione: z.number().min(3, alertMin + "3").max(3, alertMax + "3"),
   codiceBelfiore: z.number().min(4, alertMin + "4").max(4, alertMax + "4"),
   denominazioneNazione: z.number().min(1, alertMin + "1").max(20, alertMax + "20"), 
});
// ***** Fine validazione dataModel *****


export type AnagraficaUserTypeSchema = z.infer<typeof anagraficaUserTypeSchema>;
export type UserSchema = z.infer<typeof userSchema>;

export const schemas = {
    userSchema,
    anagraficaUserTypeSchema,
};