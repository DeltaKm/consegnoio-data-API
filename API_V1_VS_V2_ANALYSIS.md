# 🔍 Analisi Differenze v1 vs v2

## 🔐 MIDDLEWARE - Autenticazione API Key

### **Sistema Attuale (Middleware Globale):**

```typescript
// middleware.ts

// VERIFICA API KEY per TUTTE le route /api/*
const apiKeyHeader = req.headers.get('x-api-key');
const apiKeyQuery = req.nextUrl.searchParams.get('apiKey');
const apiKey = apiKeyHeader || apiKeyQuery;

if (!apiKey || apiKey !== process.env.NEXT_PUBLIC_API_KEY) {
  return NextResponse.json(
    { error: "Non autorizzato: API Key non valida o mancante" },
    { status: 401 }
  );
}
```

**✅ Questo significa:**
- **TUTTE** le richieste a `/api/v1/*` e `/api/v2/*` richiedono `x-api-key`
- Può essere passata come:
  - Header: `x-api-key: YOUR_API_KEY`
  - Query param: `?apiKey=YOUR_API_KEY`

**Eccezioni (NON richiedono API key):**
- `/api/v1/auth/confirm` - Conferma email
- `/api/v1/auth/reset` - Reset password

---

## 📊 Differenze Principali v1 vs v2

### **1. AUTENTICAZIONE**

#### **v1 Login:**
```typescript
POST /api/v1/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

// Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
- ❌ NON ritorna ruolo utente
- ❌ NON ritorna profilo
- ❌ Token senza scadenza (`expirationJWT: null`)

#### **v2 Login:**
```typescript
POST /api/v2/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

// Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "role": "BUSINESS"  // ← NUOVO!
  },
  "profile": {  // ← NUOVO!
    "type": "business",
    "id": "business_id",
    "name": "Pizzeria Roma",
    "address": "Via Roma 123"
  }
}
```
- ✅ Ritorna ruolo utente
- ✅ Ritorna profilo completo
- ✅ Token con scadenza 24h

---

### **2. REFRESH TOKEN**

#### **v1:**
```typescript
POST /api/v1/auth/refresh
// Richiede token valido
```

#### **v2:**
```typescript
POST /api/v2/auth/refresh
// Accetta anche token scaduto (per refresh)
// Ritorna user + profile completo
```

**✅ v2 Aggiunge:**
- `GET /api/v2/auth/me` - Verifica sessione corrente

---

### **3. CREAZIONE ORDINI**

#### **v1:**
```typescript
POST /api/v1/delivery/create?assignToRaiderId=raider_id
{
  "businessId": "business_id",  // ← OBBLIGATORIO
  "orderId": "ORD-123",
  "customerId": "customer_id",  // ← OBBLIGATORIO
  "customerName": "Mario",
  "customerSurname": "Rossi",
  "customerAddress": "Via Cliente 456",
  "customerZipcode": "00100",  // ← OBBLIGATORIO
  "customerProvince": "RM",  // ← OBBLIGATORIO
  "customerCity": "Roma",  // ← OBBLIGATORIO
  "paymentType": "Contrassegno",
  "totalPaid": 29.23,
  "mobile": "3331234567",
  "phone": "0612345678",
  "totalShipping": 5.23,
  "note": "Citofono rotto",
  "customerCoordinates": "41.9028,12.4964",
  "schedulingDelivery": "2025-03-12 21:00:00",
  "details": [  // ← OBBLIGATORIO
    {
      "id": "item_1",
      "description": "Pizza Margherita",
      "quantity": 2,
      "weight": 0.5,
      "price": 12.00,
      "category": "Food"
    }
  ]
}
```

**Caratteristiche v1:**
- ❌ Richiede `businessId` (non lo prende da auth)
- ❌ Campi obbligatori: zipcode, province, city, customerId, details
- ❌ NON verifica che il business sia proprietario
- ✅ Supporta assegnazione diretta via query param

#### **v2:**
```typescript
POST /api/v2/business/deliveries
Headers: Authorization: Bearer TOKEN

{
  "orderId": "ORD-123",  // Opzionale, generato se mancante
  "schedulingDelivery": "2025-03-12 21:00:00",
  "customerName": "Mario",
  "customerSurname": "Rossi",
  "customerAddress": "Via Cliente 456, 00100 Roma",
  "paymentType": "Contrassegno",
  "totalPaid": 29.23,
  "totalShipping": 5.23,
  "mobile": "3331234567",  // Opzionale
  "note": "Citofono rotto",  // Opzionale
  "customerCoordinates": "41.9028,12.4964",  // Opzionale
  "assignToRaiderId": "raider_id"  // Opzionale, nel body
}
```

**Caratteristiche v2:**
- ✅ `businessId` preso automaticamente da token JWT
- ✅ Campi opzionali: zipcode, province, city, customerId, details, mobile, note
- ✅ Verifica automatica proprietà (business vede solo i suoi dati)
- ✅ Assegnazione diretta nel body (non query param)
- ✅ Controllo ruolo (solo BUSINESS può creare)

---

### **4. CONTROLLO ACCESSI**

#### **v1:**
```typescript
// Usa authenticateToken() generico
// NON verifica ruolo utente
// NON verifica proprietà risorsa

// Esempio: Qualsiasi utente autenticato può creare ordini per qualsiasi business
POST /api/v1/delivery/create
{
  "businessId": "altro_business_id"  // ← Può creare per altri!
}
```

#### **v2:**
```typescript
// Usa requireBusiness(), requireLogistics(), requireAdmin()
// Verifica ruolo specifico
// Verifica proprietà risorsa

// Esempio: Business può creare solo per se stesso
POST /api/v2/business/deliveries
// businessId preso da auth.business.id automaticamente
// Impossibile creare per altri business
```

---

### **5. NOTIFICHE PUSH**

#### **v1:**
```typescript
// Notifiche implementate in:
- POST /api/v1/delivery/create
- POST /api/v1/deliveries/assign
```

#### **v2:**
```typescript
// Notifiche implementate in:
- POST /api/v2/business/deliveries (crea ordine)
- POST /api/v2/business/deliveries/:id/reassign (riassegna)
- POST /api/v2/logistics/deliveries/assign-bulk (batch)
```

**✅ Stesso sistema Firebase, stessa funzione `sendNotification()`**

---

### **6. ENDPOINT DISPONIBILI**

#### **v1 (per Raider):**
- Auth (login, register, refresh, reset password)
- Deliveries (available, my, assign, release, complete, cancel)
- Profile
- Service status
- Notifications

**Totale v1:** ~30 endpoint

#### **v2 (per Dashboard):**
- **Business:** 15 endpoint (ordini, raider, stats)
- **Logistics:** 10 endpoint (multi-tenant)
- **Admin:** 19 endpoint (gestione completa)
- **Auth:** 5 endpoint (login, refresh, me, register)

**Totale v2:** 46 endpoint

---

## 🔑 HEADERS RICHIESTI

### **Tutte le Richieste (v1 e v2):**

```typescript
{
  'x-api-key': 'YOUR_API_KEY'  // ← OBBLIGATORIO (middleware)
}
```

### **Endpoint Protetti (dopo login):**

```typescript
{
  'x-api-key': 'YOUR_API_KEY',
  'Authorization': 'Bearer JWT_TOKEN'  // ← OBBLIGATORIO
}
```

---

## 📋 CORS Headers

Il middleware aggiunge automaticamente:

```typescript
{
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  'Access-Control-Max-Age': '86400'
}
```

---

## ⚠️ DIFFERENZE CRITICHE

### **1. businessId**

**v1:**
```typescript
// Deve essere passato nel body
{
  "businessId": "business_id",
  ...
}
```

**v2:**
```typescript
// Preso automaticamente da JWT
// Business può creare solo per se stesso
```

---

### **2. Campi Obbligatori**

**v1 - Più restrittivo:**
- ✅ businessId
- ✅ customerId
- ✅ customerZipcode
- ✅ customerProvince
- ✅ customerCity
- ✅ details (array)

**v2 - Più flessibile:**
- ❌ businessId (automatico)
- ❌ customerId (opzionale)
- ❌ customerZipcode (opzionale)
- ❌ customerProvince (opzionale)
- ❌ customerCity (opzionale)
- ❌ details (opzionale)

---

### **3. Response Format**

**v1 Login:**
```json
{
  "token": "..."
}
```

**v2 Login:**
```json
{
  "token": "...",
  "user": {
    "id": "...",
    "email": "...",
    "role": "BUSINESS"
  },
  "profile": {
    "type": "business",
    "id": "...",
    "name": "...",
    "address": "..."
  }
}
```

---

## 🎯 COMPATIBILITÀ

### **App Raider (Mobile):**
- ✅ Continua a usare v1
- ✅ Nessuna modifica necessaria
- ✅ v1 completamente intatto

### **Dashboard Web:**
- ✅ Usa v2
- ✅ Controllo ruoli
- ✅ Multi-tenant Logistics

---

## 📝 DOCUMENTAZIONE CORRETTA

### **Headers Obbligatori:**

**TUTTI gli endpoint richiedono:**
```
x-api-key: YOUR_API_KEY
```

**Endpoint protetti richiedono ANCHE:**
```
Authorization: Bearer JWT_TOKEN
```

### **Esempio Completo:**

```bash
# Login (solo API key)
curl -X POST http://localhost:3000/api/v2/auth/login \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "business@example.com",
    "password": "password123"
  }'

# Crea ordine (API key + JWT)
curl -X POST http://localhost:3000/api/v2/business/deliveries \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "schedulingDelivery": "2025-03-12 21:00:00",
    "customerName": "Mario",
    "customerSurname": "Rossi",
    "customerAddress": "Via Cliente 456",
    "paymentType": "Contrassegno",
    "totalPaid": 29.23,
    "totalShipping": 5.23
  }'
```

---

## 🔒 SICUREZZA

### **v1:**
- ✅ API Key (middleware)
- ✅ JWT Token
- ❌ NO controllo ruolo
- ❌ NO verifica proprietà

### **v2:**
- ✅ API Key (middleware)
- ✅ JWT Token
- ✅ Controllo ruolo (BUSINESS/LOGISTICS/ADMIN)
- ✅ Verifica proprietà (business vede solo i suoi dati)
- ✅ Multi-tenant (logistics isolati)

---

## 📊 RIEPILOGO FINALE

| Caratteristica | v1 | v2 |
|----------------|----|----|
| **API Key** | ✅ Obbligatoria | ✅ Obbligatoria |
| **JWT Token** | ✅ Sì | ✅ Sì |
| **Controllo Ruolo** | ❌ No | ✅ Sì |
| **Verifica Proprietà** | ❌ No | ✅ Sì |
| **Multi-tenant** | ❌ No | ✅ Sì |
| **Refresh Token** | ✅ Base | ✅ Avanzato |
| **Info Profilo** | ❌ No | ✅ Sì |
| **Campi Obbligatori** | ⚠️ Molti | ✅ Pochi |
| **businessId** | ⚠️ Nel body | ✅ Automatico |
| **Notifiche** | ✅ Sì | ✅ Sì |
| **CORS** | ✅ Sì | ✅ Sì |

---

## ✅ CONCLUSIONI

### **Per Frontend Developer:**

**Ogni richiesta deve avere:**
1. Header `x-api-key: YOUR_API_KEY` (sempre)
2. Header `Authorization: Bearer TOKEN` (dopo login)

**v2 è più sicuro perché:**
- Verifica ruolo utente
- Verifica proprietà risorse
- Logistics isolati (multi-tenant)
- Campi più flessibili

**v1 rimane per:**
- App raider mobile
- Backward compatibility

---

**Versione:** 2.0  
**Data Analisi:** 2025-10-02
