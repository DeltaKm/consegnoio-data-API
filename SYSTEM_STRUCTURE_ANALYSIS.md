# 🔍 Analisi Struttura Sistema - Endpoint Mancanti

## ✅ STRUTTURA RICHIESTA (Capito!)

### **1. BUSINESS** 🏢
- ✅ Creare ordini (FATTO)
- ✅ Gestire raider (approve/remove) (FATTO)
- ❌ **MANCA: Creare raider**
- ❌ **MANCA: Modificare raider**

### **2. LOGISTICS** 🚚
- ✅ Vedere ordini dei business assegnati (FATTO)
- ❌ **MANCA: Creare ordini per i business assegnati**
- ❌ **MANCA: Creare raider della logistica**
- ❌ **MANCA: Assegnare raider ai business**
- ✅ Assegnazione batch ordini (FATTO)

### **3. ADMIN** 👨‍💼
- ✅ Vedere tutte le logistiche (FATTO)
- ✅ Assegnare business a logistics (FATTO)
- ✅ Vedere tutti i business (FATTO)
- ✅ Vedere tutti i raider (FATTO)
- ❌ **MANCA: Creare raider**
- ❌ **MANCA: Modificare raider**

---

## 📊 ENDPOINT ESISTENTI

### **✅ BUSINESS (15 endpoint)**
```
GET    /api/v2/business/deliveries           - Lista ordini
POST   /api/v2/business/deliveries           - Crea ordine ✅
GET    /api/v2/business/deliveries/:id       - Dettaglio ordine
PUT    /api/v2/business/deliveries/:id       - Modifica ordine
POST   /api/v2/business/deliveries/:id/reassign - Riassegna ordine

GET    /api/v2/business/raiders               - Lista raider
GET    /api/v2/business/raiders/pending       - Raider pending
POST   /api/v2/business/raiders/approve       - Approva raider ✅
DELETE /api/v2/business/raiders/remove        - Rimuovi raider ✅

GET    /api/v2/business/profile               - Profilo
PUT    /api/v2/business/profile               - Modifica profilo

GET    /api/v2/business/stats                 - Statistiche
```

### **✅ LOGISTICS (10 endpoint)**
```
GET    /api/v2/logistics/businesses           - Lista business assegnati
GET    /api/v2/logistics/businesses/:id       - Dettaglio business

GET    /api/v2/logistics/deliveries           - Ordini business assegnati ✅
POST   /api/v2/logistics/deliveries/assign-bulk - Assegna batch ✅

GET    /api/v2/logistics/raiders              - Raider dei business

GET    /api/v2/logistics/stats/global         - Stats globali
```

### **✅ ADMIN (19 endpoint)**
```
GET    /api/v2/admin/users                    - Lista utenti
PUT    /api/v2/admin/users/:id/role           - Cambia ruolo
PUT    /api/v2/admin/users/:id/status         - Attiva/disattiva

GET    /api/v2/admin/businesses               - Lista business
GET    /api/v2/admin/businesses/:id           - Dettaglio business
PUT    /api/v2/admin/businesses/:id           - Modifica business
DELETE /api/v2/admin/businesses/:id           - Elimina business

GET    /api/v2/admin/logistics                - Lista logistics ✅
GET    /api/v2/admin/logistics/:id            - Dettaglio logistics
PUT    /api/v2/admin/logistics/:id            - Modifica logistics
DELETE /api/v2/admin/logistics/:id            - Elimina logistics
POST   /api/v2/admin/logistics/assign-businesses   - Assegna business ✅
POST   /api/v2/admin/logistics/remove-businesses   - Rimuovi business ✅

GET    /api/v2/admin/raiders                  - Lista raider ✅
GET    /api/v2/admin/raiders/:id              - Dettaglio raider
PUT    /api/v2/admin/raiders/:id/status       - Cambia status raider

GET    /api/v2/admin/deliveries               - Tutti ordini sistema
GET    /api/v2/admin/stats                    - Stats sistema
```

---

## ❌ ENDPOINT MANCANTI

### **1. BUSINESS - Gestione Raider**

#### **POST /api/v2/business/raiders** (MANCA)
Crea nuovo raider per il business

**Body:**
```json
{
  "email": "raider@example.com",
  "password": "password123",
  "name": "Mario",
  "surname": "Rossi",
  "vehicle": "MOTORCYCLE",
  "mobile": "3331234567"
}
```

**Logica:**
1. Crea User con role RAIDER
2. Crea Raider profile
3. Crea relazione BusinessRaider con `confirmedFromBusiness: true`
4. Aggiunge raiderId a `business.raiderActived[]`
5. Aggiunge businessId a `raider.bussinesActived[]`

---

#### **PUT /api/v2/business/raiders/:id** (MANCA)
Modifica raider del business

**Body:**
```json
{
  "name": "Mario",
  "surname": "Rossi",
  "vehicle": "CAR",
  "mobile": "3331234567"
}
```

**Logica:**
1. Verifica che raider appartenga al business
2. Aggiorna dati raider

---

### **2. LOGISTICS - Gestione Ordini**

#### **POST /api/v2/logistics/deliveries** (MANCA)
Crea ordine per uno dei business assegnati

**Body:**
```json
{
  "businessId": "business_id",  // ← Deve essere uno dei business assegnati!
  "schedulingDelivery": "2025-03-12 21:00:00",
  "customerName": "Mario",
  "customerSurname": "Rossi",
  "customerAddress": "Via Cliente 456",
  "paymentType": "Contrassegno",
  "totalPaid": 29.99,
  "totalShipping": 5.00
}
```

**Logica:**
1. Verifica che `businessId` sia in `logistics.businessRelations[]`
2. Crea ordine per quel business
3. ✅ Logistics può creare ordini solo per i business assegnati

---

### **3. LOGISTICS - Gestione Raider**

#### **POST /api/v2/logistics/raiders** (MANCA)
Crea raider della logistica

**Body:**
```json
{
  "email": "raider@example.com",
  "password": "password123",
  "name": "Mario",
  "surname": "Rossi",
  "vehicle": "MOTORCYCLE",
  "mobile": "3331234567"
}
```

**Logica:**
1. Crea User con role RAIDER
2. Crea Raider profile
3. Raider appartiene alla logistica (da definire come)

---

#### **POST /api/v2/logistics/raiders/assign** (MANCA)
Assegna raider della logistica a business

**Body:**
```json
{
  "raiderId": "raider_id",
  "businessIds": ["bus1", "bus2"]  // ← Solo business assegnati alla logistica
}
```

**Logica:**
1. Verifica che raider appartenga alla logistica
2. Verifica che business siano assegnati alla logistica
3. Crea relazioni BusinessRaider
4. Aggiorna array `raiderActived[]` e `bussinesActived[]`

---

#### **PUT /api/v2/logistics/raiders/:id** (MANCA)
Modifica raider della logistica

**Body:**
```json
{
  "name": "Mario",
  "surname": "Rossi",
  "vehicle": "CAR",
  "mobile": "3331234567"
}
```

---

### **4. ADMIN - Gestione Raider**

#### **POST /api/v2/admin/raiders** (MANCA)
Crea raider (admin può creare per qualsiasi business/logistics)

**Body:**
```json
{
  "email": "raider@example.com",
  "password": "password123",
  "name": "Mario",
  "surname": "Rossi",
  "vehicle": "MOTORCYCLE",
  "mobile": "3331234567",
  "assignToBusinessIds": ["bus1", "bus2"],  // Opzionale
  "assignToLogisticsId": "logistics_id"     // Opzionale
}
```

---

#### **PUT /api/v2/admin/raiders/:id** (MANCA)
Modifica raider (admin può modificare qualsiasi raider)

**Body:**
```json
{
  "name": "Mario",
  "surname": "Rossi",
  "vehicle": "CAR",
  "mobile": "3331234567",
  "email": "newemail@example.com"
}
```

---

## 🔑 PROBLEMA: Raider-Logistics Relation

**Attualmente NON esiste relazione diretta Raider-Logistics nel schema!**

```prisma
model Raider {
  id                String   @id @default(auto()) @map("_id") @db.ObjectId
  userId            String   @unique @db.ObjectId
  bussinesActived   String[] @db.ObjectId  // ← Array business
  // ❌ MANCA: logisticsId o logisticsActived[]
}

model Logistics {
  id               String   @id @default(auto()) @map("_id") @db.ObjectId
  userId           String   @unique @db.ObjectId
  businessRelations LogisticsBusinessRelation[]
  // ❌ MANCA: relazione con Raider
}
```

### **Soluzioni Possibili:**

#### **Opzione 1: Raider appartiene a Logistics**
```prisma
model Raider {
  logisticsId  String?  @db.ObjectId  // ← Raider appartiene a 1 logistics
  logistics    Logistics? @relation(fields: [logisticsId], references: [id])
}
```

**Pro:**
- Semplice
- Raider ha un "proprietario" (logistics)

**Contro:**
- Raider può appartenere solo a 1 logistics
- Business non può creare raider propri

---

#### **Opzione 2: Raider indipendente, assegnato tramite BusinessRaider**
```prisma
// Nessuna modifica schema
// Raider creato da Business → businessId nel raider
// Raider creato da Logistics → logisticsId nel raider
// Assegnazioni tramite BusinessRaider

model Raider {
  createdByBusinessId   String?  @db.ObjectId
  createdByLogisticsId  String?  @db.ObjectId
}
```

**Pro:**
- Flessibile
- Business e Logistics possono creare raider

**Contro:**
- Più complesso da gestire

---

#### **Opzione 3: Tabella LogisticsRaider (come BusinessRaider)**
```prisma
model LogisticsRaider {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  logisticsId String   @db.ObjectId
  raiderId    String   @db.ObjectId
  
  logistics   Logistics @relation(fields: [logisticsId], references: [id])
  raider      Raider    @relation(fields: [raiderId], references: [id])
  
  @@unique([logisticsId, raiderId])
}
```

**Pro:**
- Simmetrico con BusinessRaider
- Raider può appartenere a multipli logistics

**Contro:**
- Più tabelle da gestire

---

## 📋 RIEPILOGO ENDPOINT DA CREARE

### **BUSINESS (2 nuovi endpoint)**
- ❌ `POST /api/v2/business/raiders` - Crea raider
- ❌ `PUT /api/v2/business/raiders/:id` - Modifica raider

### **LOGISTICS (4 nuovi endpoint)**
- ❌ `POST /api/v2/logistics/deliveries` - Crea ordine per business assegnato
- ❌ `POST /api/v2/logistics/raiders` - Crea raider
- ❌ `POST /api/v2/logistics/raiders/assign` - Assegna raider a business
- ❌ `PUT /api/v2/logistics/raiders/:id` - Modifica raider

### **ADMIN (2 nuovi endpoint)**
- ❌ `POST /api/v2/admin/raiders` - Crea raider
- ❌ `PUT /api/v2/admin/raiders/:id` - Modifica raider

**TOTALE: 8 nuovi endpoint**

---

## ⚠️ DECISIONI DA PRENDERE

### **1. Schema Raider-Logistics**
Quale opzione scegliere?
- Opzione 1: `logisticsId` nel Raider
- Opzione 2: `createdBy` fields
- Opzione 3: Tabella `LogisticsRaider`

### **2. Creazione Raider**
Chi può creare raider?
- ✅ Business → raider solo per sé
- ✅ Logistics → raider per i business assegnati
- ✅ Admin → raider per chiunque

### **3. Modifica Raider**
Chi può modificare raider?
- ✅ Business → solo i propri raider
- ✅ Logistics → raider della logistica
- ✅ Admin → qualsiasi raider

---

## 🎯 RACCOMANDAZIONE

**Suggerisco Opzione 2 (createdBy fields):**

```prisma
model Raider {
  id                    String   @id @default(auto()) @map("_id") @db.ObjectId
  userId                String   @unique @db.ObjectId
  name                  String
  surname               String
  vehicle               String
  mobile                String?
  
  // Chi ha creato il raider
  createdByBusinessId   String?  @db.ObjectId
  createdByLogisticsId  String?  @db.ObjectId
  createdByAdminId      String?  @db.ObjectId
  
  // Relazioni esistenti
  bussinesActived       String[] @db.ObjectId
  businessRelations     BusinessRaider[]
  
  user                  User     @relation(fields: [userId], references: [id])
}
```

**Vantaggi:**
1. ✅ Business crea raider → `createdByBusinessId` settato
2. ✅ Logistics crea raider → `createdByLogisticsId` settato
3. ✅ Admin crea raider → `createdByAdminId` settato
4. ✅ Raider può essere assegnato a multipli business (via BusinessRaider)
5. ✅ Controllo permessi: "Posso modificare questo raider?"

---

## ✅ PROSSIMI PASSI

1. **Decidere schema Raider-Logistics**
2. **Aggiornare Prisma schema**
3. **Creare 8 nuovi endpoint**
4. **Testare flusso completo**
5. **Aggiornare documentazione**

---

**Versione:** 2.0  
**Data:** 2025-10-02  
**Status:** ⚠️ ANALISI COMPLETA - DECISIONI RICHIESTE
