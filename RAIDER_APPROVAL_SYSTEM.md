# 🔄 Sistema Approvazione Raider - Spiegazione Completa

## ✅ HAI RAGIONE!

**Problema risolto:** Gli endpoint ora supportano sia `raiderId` (singolo) che `raiderIds` (array)

---

## 🔍 Come Funziona il Sistema

### **1. Relazione Business-Raider**

```prisma
model BusinessRaider {
  id                     String   @id @default(auto()) @map("_id") @db.ObjectId
  businessId             String   @db.ObjectId
  raiderId               String   @db.ObjectId
  confirmedFromBusiness  Boolean  @default(false)  // ← CHIAVE!
  createdAt              DateTime @default(now())
  
  business Business @relation(fields: [businessId], references: [id])
  raider   Raider   @relation(fields: [raiderId], references: [id])
  
  @@unique([businessId, raiderId])
}
```

**Campi Importanti:**
- `confirmedFromBusiness: false` → Raider in attesa di approvazione
- `confirmedFromBusiness: true` → Raider approvato e attivo

---

## 📋 Flusso Completo

### **Step 1: Raider Richiede Abilitazione (App Mobile v1)**

```typescript
// Il raider dall'app mobile richiede di lavorare per un business
POST /api/v1/reltest/assignRaiderToBusiness
{
  "raiderId": "raider_id",
  "businessIds": ["business_id"]
}

// Crea relazione con confirmedFromBusiness: false
```

**Cosa succede:**
1. Crea record in `BusinessRaider` con `confirmedFromBusiness: false`
2. Aggiunge `businessId` in `raider.bussinesActived[]`
3. Aggiunge `raiderId` in `business.raiderActived[]`

---

### **Step 2: Business Vede Richieste Pending (Dashboard v2)**

```typescript
GET /api/v2/business/raiders/pending

// Response:
{
  "count": 3,
  "requests": [
    {
      "relationId": "relation_id",
      "raiderId": "raider_id",
      "name": "Luca",
      "surname": "Bianchi",
      "vehicle": "MOTORCYCLE",
      "email": "luca@example.com",
      "requestedAt": "2025-03-10T10:00:00.000Z"
    }
  ]
}
```

**UI Possibile:**
- 🔔 Badge con numero richieste pending
- 📋 Lista raider in attesa
- ✅ Bottone "Approva"
- ❌ Bottone "Rifiuta"

---

### **Step 3: Business Approva Raider (Dashboard v2)**

```typescript
// Approva singolo raider
POST /api/v2/business/raiders/approve
{
  "raiderId": "raider_id"
}

// Oppure approva multipli
POST /api/v2/business/raiders/approve
{
  "raiderIds": ["raider_id_1", "raider_id_2"]
}

// Response:
{
  "message": "2 raider approvati con successo",
  "approvedRaiderIds": ["raider_id_1", "raider_id_2"]
}
```

**Cosa succede:**
1. Aggiorna `confirmedFromBusiness: true` nella relazione
2. Conferma `raiderId` in `business.raiderActived[]`
3. Conferma `businessId` in `raider.bussinesActived[]`

**✅ Ora il raider può:**
- Vedere ordini del business
- Ricevere assegnazioni
- Ricevere notifiche push

---

### **Step 4: Business Rimuove Raider (Dashboard v2)**

```typescript
// Rimuovi singolo raider
DELETE /api/v2/business/raiders/remove
{
  "raiderId": "raider_id"
}

// Oppure rimuovi multipli
DELETE /api/v2/business/raiders/remove
{
  "raiderIds": ["raider_id_1", "raider_id_2"]
}

// Response:
{
  "message": "2 raider rimossi con successo",
  "removedRaiderIds": ["raider_id_1", "raider_id_2"]
}
```

**Cosa succede:**
1. Elimina record da `BusinessRaider`
2. Rimuove `raiderId` da `business.raiderActived[]`
3. Rimuove `businessId` da `raider.bussinesActived[]`

**❌ Il raider NON può più:**
- Vedere ordini del business
- Ricevere assegnazioni
- Ricevere notifiche

---

## 🆚 Differenza v1 vs v2

### **v1 - assignRaiderToBusiness (Admin/Logistics)**

```typescript
POST /api/v1/reltest/assignRaiderToBusiness
{
  "raiderId": "raider_id",
  "businessIds": ["bus1", "bus2", "bus3"]  // ← Array business
}
```

**Caratteristiche:**
- 1 raider → MULTIPLI business
- Usato da Admin/Logistics per setup iniziale
- Crea relazioni con `confirmedFromBusiness: false`

---

### **v2 - approve/remove (Business)**

```typescript
POST /api/v2/business/raiders/approve
{
  "raiderId": "raider_id"  // ← Singolo o array
}
```

**Caratteristiche:**
- 1 business → MULTIPLI raider
- Usato da Business per approvare richieste
- Aggiorna `confirmedFromBusiness: true`
- `businessId` preso automaticamente da JWT

---

## 🔑 Differenza Chiave: businessId

### **v1:**
```json
{
  "raiderId": "raider_id",
  "businessIds": ["bus1", "bus2"]  // ← Nel body
}
```
- ❌ businessId passato nel body
- ❌ Admin può assegnare a qualsiasi business
- ❌ NO controllo proprietà

### **v2:**
```json
{
  "raiderId": "raider_id"
}
// businessId preso da JWT automaticamente!
```
- ✅ businessId da JWT (auth.business.id)
- ✅ Business approva solo per se stesso
- ✅ Controllo proprietà automatico

---

## 📊 Array Sincronizzati

Il sistema mantiene 3 array sincronizzati:

### **1. BusinessRaider (Tabella Relazione)**
```typescript
{
  businessId: "bus_id",
  raiderId: "raider_id",
  confirmedFromBusiness: true  // ← Stato approvazione
}
```

### **2. Business.raiderActived[]**
```typescript
{
  id: "bus_id",
  raiderActived: ["raider1", "raider2", "raider3"]  // ← Raider abilitati
}
```

### **3. Raider.bussinesActived[]**
```typescript
{
  id: "raider_id",
  bussinesActived: ["bus1", "bus2", "bus3"]  // ← Business abilitati
}
```

**Perché 3 array?**
- `BusinessRaider` → Relazione con stato (pending/approved)
- `Business.raiderActived[]` → Query veloci "quali raider ha questo business?"
- `Raider.bussinesActived[]` → Query veloci "per quali business lavora questo raider?"

---

## 🎨 UI Frontend Possibile

### **Dashboard Business - Sezione Raider:**

```typescript
// Tab 1: Raider Attivi
GET /api/v2/business/raiders
// Mostra raider approvati con badge status

// Tab 2: Richieste Pending (con badge notifica)
GET /api/v2/business/raiders/pending
// Mostra richieste in attesa

// Bottoni:
- ✅ Approva (singolo)
- ✅ Approva Selezionati (multipli)
- 🗑️ Rimuovi (singolo)
- 🗑️ Rimuovi Selezionati (multipli)
```

**Esempio UI:**

```
┌─────────────────────────────────────────┐
│ 👥 Raider Abilitati                     │
├─────────────────────────────────────────┤
│ [Attivi: 8] [Pending: 3 🔔]             │
├─────────────────────────────────────────┤
│                                         │
│ Tab: [Attivi] [Pending]                 │
│                                         │
│ ☑️ Mario Rossi    🟢 Online   [Rimuovi] │
│ ☑️ Luca Bianchi   🔴 Offline  [Rimuovi] │
│ ☑️ Anna Verdi     🟢 Online   [Rimuovi] │
│                                         │
│ [Rimuovi Selezionati]                   │
│                                         │
│ --- Richieste Pending ---               │
│                                         │
│ ☑️ Giovanni Neri  🏍️ Moto    [Approva]  │
│ ☑️ Sara Gialli    🚗 Auto    [Approva]  │
│                                         │
│ [Approva Selezionati]                   │
└─────────────────────────────────────────┘
```

---

## ✅ MODIFICHE APPLICATE

### **1. approve/route.ts**
```typescript
// Prima (solo array):
const { raiderIds } = body;

// Dopo (singolo o array):
const { raiderId, raiderIds } = body;
let raiderIdsArray: string[];
if (raiderId) {
  raiderIdsArray = [raiderId];
} else if (raiderIds && Array.isArray(raiderIds)) {
  raiderIdsArray = raiderIds;
}
```

### **2. remove/route.ts**
```typescript
// Stessa modifica: supporta sia raiderId che raiderIds
```

### **3. API_DOCUMENTATION_V2.md**
```markdown
#### `POST /api/v2/business/raiders/approve`
Approva raider in attesa (singolo o multipli)

**Body (singolo):**
{
  "raiderId": "raider_id"
}

**Body (multipli):**
{
  "raiderIds": ["raider_id_1", "raider_id_2"]
}
```

---

## 🎯 RIEPILOGO

| Caratteristica | v1 assignRaiderToBusiness | v2 approve/remove |
|----------------|---------------------------|-------------------|
| **Chi lo usa** | Admin/Logistics | Business |
| **Direzione** | 1 raider → N business | 1 business → N raider |
| **businessId** | Nel body (array) | Da JWT (automatico) |
| **Formato** | Array business | Singolo o array raider |
| **Stato** | Crea pending | Approva/rimuove |
| **Controllo** | NO proprietà | SÌ proprietà |

---

## 📝 ESEMPIO COMPLETO

### **Scenario: Pizzeria Roma vuole approvare 2 raider**

**1. Raider fanno richiesta (app mobile):**
```typescript
// Raider 1
POST /api/v1/reltest/assignRaiderToBusiness
{ "raiderId": "raider1", "businessIds": ["pizzeria_roma_id"] }

// Raider 2
POST /api/v1/reltest/assignRaiderToBusiness
{ "raiderId": "raider2", "businessIds": ["pizzeria_roma_id"] }
```

**2. Pizzeria Roma vede richieste (dashboard):**
```typescript
GET /api/v2/business/raiders/pending
// Response: 2 richieste pending
```

**3. Pizzeria Roma approva entrambi:**
```typescript
POST /api/v2/business/raiders/approve
{
  "raiderIds": ["raider1", "raider2"]
}
// ✅ Approvati! Ora possono ricevere ordini
```

**4. Dopo 1 mese, Pizzeria Roma rimuove raider1:**
```typescript
DELETE /api/v2/business/raiders/remove
{
  "raiderId": "raider1"
}
// ❌ Rimosso! Non può più vedere ordini
```

---

**✅ Sistema completo e funzionante!**

**Versione:** 2.0  
**Data:** 2025-10-02
