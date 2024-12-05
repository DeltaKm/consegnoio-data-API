
// Index:
//  zVal objType    r14    
//  zVal dataModel  r67

import { RuoloEnum, PosMapType, Customer } from "@prisma/client";
import { preset } from "swr/_internal";
import { object, z } from "zod"


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
    idSlug: z.string().min(8, alertMin + "8").max(8, alertMax + "16"),
    email: z.string()
    .min(1, { message: "Questo capodo deve essere riempito" })
    .email("Email non valida"),
    username: z.string().min(5, alertMin + "5").max(10, alertMax + "10"),
    password: z.string().min(8, alertMin + "8").max(16, alertMax + "16"),
    tel: z.string().min(8, alertMin + "8").max(16, alertMax + "16"), 
      
    // role: z.enum()
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
    codiceIstat: z.string().min(5, alertMin + "5").max(5, alertMax + "5"),
    denominazioneIta: z.string().min(2, alertMin + "2").max(20, alertMax + "20"),
    cap: z.string().min(5, alertMin + "5").max(5, alertMax + "5"),
    siglaProvincia: z.string().min(2, alertMin + "2").max(2, alertMax + "2"),
    denominazioneProvincia: z.string().min(2, alertMin + "2").max(20, alertMax + "20"),
    denominazioneRegione: z.string().min(2, alertMin + "2").max(20, alertMax + "20"),
});

export const nazioniSchema = z.object({
   siglaNazione: z.string().min(3, alertMin + "3").max(3, alertMax + "3"),
   codiceBelfiore: z.string().min(4, alertMin + "4").max(4, alertMax + "4"),
   denominazioneNazione: z.number().min(1, alertMin + "1").max(20, alertMax + "20"), 
});

export const CustomerSchema = z.object({
    name: z.string().min(2, alertMin + "2").max(20, alertMax + "20"),
    tel: z.string().min(2, alertMin + "2").max(20, alertMax + "20"),
});

export const CustomerNoteSchema = z.object({
    note: z.string().min(2, alertMin + "2").max(64, alertMax + "64")
});

export const WalletSchema = z.object({
    userId: z.string().min(2, alertMin + "2").max(16, alertMax + "16"),
    tokenName: z.string().min(2, alertMin + "2").max(16, alertMax + "16"),
    valueEur: z.number().min(1, alertMin + "1").max(20, alertMax + "20"),
    tokenAmmount: z.number().min(1, alertMin + "1").max(20, alertMax + "20"),
})

export const ViewRaiderSchema = z.object({
    raiderId: z.string().min(2, alertMin + "2").max(16, alertMax + "16"),
    numeroConsegne: z.number().min(1, alertMin + "1").max(20, alertMax + "20"),
    areaConsegne: z.string().min(2, alertMin + "2").max(16, alertMax + "16"),
    rating: z.string().min(2, alertMin + "2").max(16, alertMax + "16"),   
})

export const ViewContractorSchema = z.object({
    contractorId: z.string().min(2, alertMin + "2").max(16, alertMax + "16"), 
    areaConsegna: z.string().min(2, alertMin + "2").max(16, alertMax + "16"), 
    rating: z.string().min(2, alertMin + "2").max(16, alertMax + "16"), 
})

export const CorsConfigSchema = z.object({
    mobileClientParam: z.string().min(2, alertMin + "2").max(16, alertMax + "16"),
    dashBoardParam: z.string().min(2, alertMin + "2").max(16, alertMax + "16"), 
    serviceParam: z.string().min(2, alertMin + "2").max(16, alertMax + "16"), 
    cloudParam: z.string().min(2, alertMin + "2").max(16, alertMax + "16"), 
})

export const VercelConfigSchema = z.object({
    amazonUrl: z.string().min(2, alertMin + "2").max(16, alertMax + "16"), 
    googleUrl: z.string().min(2, alertMin + "2").max(16, alertMax + "16"), 
})

export const ClientDashBoardCofngiSchema = z.object({
    path: z.string().min(2, alertMin + "2").max(16, alertMax + "16"), 
})

export const ClientMobileConfigSchema = z.object({
    path: z.string().min(2, alertMin + "2").max(16, alertMax + "16"), 
})

export const ChatLogSchema = z.object({
    presetMessage: z.string().min(2, alertMin + "2").max(16, alertMax + "16"), 
    textMessage: z.string().min(2, alertMin + "2").max(16, alertMax + "16"), 
    raiderId: z.string().min(2, alertMin + "2").max(16, alertMax + "16"), 
    contractorId: z.string().min(2, alertMin + "2").max(16, alertMax + "16"),     
})

export const FirebaseRaiderNotificationSchema = z.object({
    presetMessage: z.string().min(2, alertMin + "2").max(16, alertMax + "16"), 
    message: z.string().min(2, alertMin + "2").max(16, alertMax + "16"),
})

export const FirebaseContractorNotificationSchema = z.object({
    presetMessage: z.string().min(2, alertMin + "2").max(16, alertMax + "16"), 
    message: z.string().min(2, alertMin + "2").max(16, alertMax + "16"),    
})

export const PrevDDSConfigSchema = z.object({
    url: z.string().min(2, alertMin + "2").max(16, alertMax + "16"),
    cloudflareConfig: z.string().min(2, alertMin + "2").max(16, alertMax + "16"),
    tcpFirewall: z.string().min(2, alertMin + "2").max(16, alertMax + "16"),
})

export const MultiDeliverySystemSchema = z.object({
    addressCompare: z.string().min(2, alertMin + "2").max(16, alertMax + "16"),
    addressSetMultyDelivery: z.string().min(2, alertMin + "2").max(16, alertMax + "16"),
})

export const TrackingRaiderSchema = z.object({
    lastPosition: z.string().min(2, alertMin + "2").max(16, alertMax + "16"),
    livePosition: z.string().min(2, alertMin + "2").max(16, alertMax + "16"),
})

export const DeliveryAreaPlusSchema = z.object({
    userId: z.string().min(2, alertMin + "2").max(16, alertMax + "16"),
    radiusRangeCord: z.string().min(2, alertMin + "2").max(16, alertMax + "16"),
    location: z.string().min(2, alertMin + "2").max(16, alertMax + "16"),
})

export const RaiderAppConfigSchema = z.object({
    config: z.string().min(2, alertMin + "2").max(16, alertMax + "16"),
})

export const ContractorAppConfigSchema = z.object({
    config: z.string().min(2, alertMin + "2").max(16, alertMax + "16"),
})

export const AdminDashBoardConfigSchema = z.object({
    config: z.string().min(2, alertMin + "2").max(16, alertMax + "16"),
    providerData: z.string().min(2, alertMin + "2").max(16, alertMax + "16"),
    dbDrivere: z.string().min(2, alertMin + "2").max(16, alertMax + "16"),    
})

export const BusinessDashboardConfigSchema = z.object({
    config: z.string().min(2, alertMin + "2").max(16, alertMax + "16"),
    providerData: z.string().min(2, alertMin + "2").max(16, alertMax + "16"),
    dbDriver: z.string().min(2, alertMin + "2").max(16, alertMax + "16"),    
})

export const serverConfigSchema = z.object({
    config: z.string().min(2, alertMin + "2").max(16, alertMax + "16"),
    service: z.string().min(2, alertMin + "2").max(16, alertMax + "16"),
    providerData: z.string().min(2, alertMin + "2").max(16, alertMax + "16"),
    osDriver: z.string().min(2, alertMin + "2").max(16, alertMax + "16"),
})

export const FeedbackSchema = z.object ({
    presetMessage: z.string().min(2, alertMin + "2").max(16, alertMax + "16"),
    message: z.string().min(2, alertMin + "2").max(16, alertMax + "16"),
})

export const ValidationDeliverySchema = z.object({
    deliveryId: z.string().min(2, alertMin + "2").max(16, alertMax + "16"),
    validaiton: z.boolean(),
    isValidate: z.boolean()
})
// ***** Fine validazione dataModel *****


export type UserSchema = z.infer<typeof userSchema>;
export type ComuniSchema = z.infer<typeof comuniSchema>;

export const schemas = {
    userSchema,
};