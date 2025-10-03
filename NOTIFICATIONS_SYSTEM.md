# 🔔 Sistema Notifiche Push - Firebase Cloud Messaging

## ✅ Notifiche Già Implementate in v2

Il sistema notifiche Firebase è **già integrato** in tutti gli endpoint v2 che creano o assegnano ordini.

---

## 📱 Come Funziona

### **1. Raider Registra Device Token**

Il raider registra il suo device token FCM tramite:
```
POST /api/raider/register-token
{
  "token": "FCM_DEVICE_TOKEN"
}
```

Il token viene salvato in `Raider.deviceTokens[]` (array per supportare più dispositivi).

---

### **2. Quando Viene Inviata una Notifica**

#### **Scenario A: Business crea ordine SENZA assegnazione**
```
POST /v2/business/deliveries
(senza assignToRaiderId)
```

**Cosa succede:**
1. Ordine creato con `status: CREATED`
2. Sistema cerca raider idonei:
   - `isActive: true`
   - `inService: true`
   - `id` in `business.raiderActived`
3. **Notifica inviata a TUTTI i raider idonei**

**Notifica:**
```
Titolo: "Nuova consegna disponibile"
Corpo: "Pizzeria Roma - Orario: 21:00"
Data: {
  type: "new_delivery",
  deliveryId: "...",
  businessName: "Pizzeria Roma",
  scheduledTime: "21:00"
}
```

---

#### **Scenario B: Business crea ordine CON assegnazione diretta**
```
POST /v2/business/deliveries
{
  ...,
  "assignToRaiderId": "raider_id"
}
```

**Cosa succede:**
1. Ordine creato con `status: ASSIGNED`
2. Creato record `AssignedDelivery`
3. **Notifica inviata SOLO al raider assegnato**

**Notifica:**
```
Titolo: "Nuova consegna assegnata"
Corpo: "Pizzeria Roma - Orario: 21:00"
Data: {
  type: "assigned_delivery",
  deliveryId: "...",
  businessName: "Pizzeria Roma",
  scheduledTime: "21:00"
}
```

---

#### **Scenario C: Business riassegna ordine**
```
POST /v2/business/deliveries/:id/reassign
{
  "newRaiderId": "new_raider_id"
}
```

**Cosa succede:**
1. Vecchia assegnazione rimossa
2. Nuova assegnazione creata
3. **Notifica inviata al NUOVO raider**

**Notifica:**
```
Titolo: "Nuova consegna assegnata"
Corpo: "Pizzeria Roma - Orario: 21:00"
Data: {
  type: "assigned_delivery",
  deliveryId: "...",
  businessName: "Pizzeria Roma",
  scheduledTime: "21:00"
}
```

---

#### **Scenario D: Logistics assegna ordini in batch**
```
POST /v2/logistics/deliveries/assign-bulk
{
  "deliveryIds": ["id1", "id2", "id3"],
  "raiderId": "raider_id"
}
```

**Cosa succede:**
1. Tutti gli ordini assegnati al raider
2. **Notifica singola con conteggio**

**Notifica:**
```
Titolo: "Nuove consegne assegnate"
Corpo: "Ti sono state assegnate 3 nuove consegne"
Data: {
  type: "bulk_assignment",
  count: "3"
}
```

---

## 🔧 Implementazione Tecnica

### **Funzione `sendNotification()` in `lib/fcm.ts`:**

```typescript
export async function sendNotification(
  raiderId: string,
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
)
```

**Cosa fa:**
1. Invia notifica a tutti i token del raider
2. Gestisce errori per token non validi
3. **Rimuove automaticamente token scaduti** dal DB
4. Ritorna statistiche (success/failure count)

**Sicurezza:**
- ❌ NON invia indirizzi nelle notifiche (privacy)
- ✅ Invia solo: businessName, scheduledTime, type

---

## 📋 Endpoint v2 con Notifiche

### **✅ Business Dashboard:**

| Endpoint | Notifica | A Chi |
|----------|----------|-------|
| `POST /v2/business/deliveries` (senza assign) | ✅ "Nuova consegna disponibile" | Tutti raider idonei |
| `POST /v2/business/deliveries` (con assign) | ✅ "Nuova consegna assegnata" | Raider specifico |
| `POST /v2/business/deliveries/:id/reassign` | ✅ "Nuova consegna assegnata" | Nuovo raider |

### **✅ Logistics:**

| Endpoint | Notifica | A Chi |
|----------|----------|-------|
| `POST /v2/logistics/deliveries/assign-bulk` | ✅ "Nuove consegne assegnate" | Raider assegnato |

### **❌ Endpoint SENZA Notifiche (non necessarie):**
- `PUT /v2/business/deliveries/:id` - Modifica ordine (raider già sa)
- `DELETE /v2/business/deliveries/:id` - Cancella ordine (non ancora assegnato)
- Tutti gli endpoint GET (solo lettura)
- Endpoint Admin (non riguardano raider)

---

## 🎯 Tipi di Notifica

### **1. `new_delivery` - Nuova consegna disponibile**
**Quando:** Ordine creato senza assegnazione  
**A chi:** Tutti raider idonei del business  
**Azione raider:** Può prendere la consegna

### **2. `assigned_delivery` - Consegna assegnata**
**Quando:** Ordine assegnato direttamente o riassegnato  
**A chi:** Raider specifico  
**Azione raider:** Deve accettare/gestire la consegna

### **3. `bulk_assignment` - Assegnazione multipla**
**Quando:** Logistics assegna più ordini insieme  
**A chi:** Raider assegnato  
**Azione raider:** Ha ricevuto più consegne

---

## 🔍 Logica Raider Idonei

Per ricevere notifica "nuova consegna disponibile", il raider deve:

1. ✅ `isActive: true` - Raider attivo nel sistema
2. ✅ `inService: true` - Raider in servizio (disponibile)
3. ✅ `id` in `business.raiderActived` - Abilitato per quel business

**Esempio:**
```typescript
const eligibleRaiders = await prisma.raider.findMany({
  where: {
    isActive: true,
    inService: true,
    id: { in: auth.business.raiderActived }
  }
});
```

---

## 📱 App Raider - Gestione Notifiche

### **Quando raider riceve notifica:**

**1. Notifica "new_delivery":**
```json
{
  "title": "Nuova consegna disponibile",
  "body": "Pizzeria Roma - Orario: 21:00",
  "data": {
    "type": "new_delivery",
    "deliveryId": "delivery_id",
    "businessName": "Pizzeria Roma",
    "scheduledTime": "21:00"
  }
}
```

**App raider:**
- Mostra notifica
- Al tap: apre lista consegne disponibili
- Raider può prendere la consegna

---

**2. Notifica "assigned_delivery":**
```json
{
  "title": "Nuova consegna assegnata",
  "body": "Pizzeria Roma - Orario: 21:00",
  "data": {
    "type": "assigned_delivery",
    "deliveryId": "delivery_id",
    "businessName": "Pizzeria Roma",
    "scheduledTime": "21:00"
  }
}
```

**App raider:**
- Mostra notifica
- Al tap: apre dettaglio consegna assegnata
- Consegna già nelle "Mie Consegne"

---

**3. Notifica "bulk_assignment":**
```json
{
  "title": "Nuove consegne assegnate",
  "body": "Ti sono state assegnate 3 nuove consegne",
  "data": {
    "type": "bulk_assignment",
    "count": "3"
  }
}
```

**App raider:**
- Mostra notifica
- Al tap: apre lista "Mie Consegne"
- Vede tutte le nuove consegne

---

## 🛡️ Gestione Errori

### **Token Non Validi:**

La funzione `sendNotification()` gestisce automaticamente:

```typescript
if (
  code === 'messaging/registration-token-not-registered' ||
  code === 'messaging/invalid-registration-token'
) {
  // Rimuove token non valido dall'array
  validTokens = validTokens.filter(t => t !== token);
}

// Aggiorna DB con token validi
await prisma.raider.update({
  where: { id: raiderId },
  data: {
    deviceTokens: { set: validTokens }
  }
});
```

**Vantaggi:**
- ✅ DB sempre pulito (solo token validi)
- ✅ Nessun errore per token scaduti
- ✅ Automatico (nessun intervento manuale)

---

## 🔄 Flusso Completo con Notifiche

### **Esempio: Business crea ordine**

```
1. Business: POST /v2/business/deliveries
   {
     "customerName": "Mario Rossi",
     "schedulingDelivery": "2025-03-12 21:00:00",
     ...
   }
   
2. Backend:
   ✅ Crea ordine nel DB
   ✅ Trova raider idonei (isActive, inService, abilitati)
   ✅ Invia notifica a tutti i raider idonei
   
3. Raider (app mobile):
   📱 Riceve notifica push
   📱 Tap su notifica
   📱 App apre lista consegne disponibili
   📱 Raider vede nuovo ordine
   📱 Raider prende ordine: POST /v1/deliveries/assign
   
4. Backend:
   ✅ Assegna ordine al raider
   ✅ Aggiorna status: ASSIGNED
   ✅ Crea record AssignedDelivery
   
5. Business:
   📊 Vede ordine assegnato nella dashboard
   📊 Vede quale raider l'ha preso
```

---

## 📊 Statistiche Notifiche

La funzione `sendNotification()` ritorna:

```typescript
{
  successCount: 5,      // Notifiche inviate con successo
  failureCount: 1,      // Notifiche fallite
  results: [
    { token: "...", success: true, messageId: "..." },
    { token: "...", success: false, errorCode: "..." }
  ]
}
```

Puoi usare questi dati per:
- Monitorare delivery rate notifiche
- Identificare raider con problemi di connessione
- Debug problemi notifiche

---

## 🎯 Best Practices

### **1. Raider deve mantenere token aggiornato:**
```
// All'avvio app o refresh token
POST /api/raider/register-token
{
  "token": "NEW_FCM_TOKEN"
}
```

### **2. Business può scegliere:**
- **Notifica broadcast:** Non specificare `assignToRaiderId`
- **Assegnazione diretta:** Specificare `assignToRaiderId`

### **3. Logistics può assegnare in batch:**
- Più efficiente per grandi volumi
- Notifica singola al raider (non spam)

---

## ⚠️ Note Importanti

### **Privacy:**
- ❌ Indirizzi NON inviati nelle notifiche
- ✅ Solo businessName e orario
- ✅ Dettagli completi solo in app

### **Performance:**
- ✅ Notifiche inviate in modo asincrono
- ✅ Errori non bloccano creazione ordine
- ✅ Token non validi rimossi automaticamente

### **Configurazione Firebase:**
Variabili ambiente richieste:
```env
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_PRIVATE_KEY=your_private_key
```

---

## 📋 Riepilogo Notifiche v2

| Endpoint | Notifica | Tipo | Destinatari |
|----------|----------|------|-------------|
| `POST /v2/business/deliveries` (no assign) | ✅ | new_delivery | Tutti raider idonei |
| `POST /v2/business/deliveries` (con assign) | ✅ | assigned_delivery | Raider specifico |
| `POST /v2/business/deliveries/:id/reassign` | ✅ | assigned_delivery | Nuovo raider |
| `POST /v2/logistics/deliveries/assign-bulk` | ✅ | bulk_assignment | Raider assegnato |
| Altri endpoint | ❌ | - | - |

---

## ✅ Sistema Completo

**Le notifiche sono già integrate e funzionanti in v2!**

Nessuna modifica necessaria - il sistema è pronto! 🎉
