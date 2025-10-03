#  Consegnoio API v2 

## Autenticazione

### **Headers Obbligatori:**

**TUTTE le richieste richiedono API Key:**
```
x-api-key: YOUR_API_KEY
```

**Endpoint protetti richiedono ANCHE JWT Token:**
```
x-api-key: YOUR_API_KEY
Authorization: Bearer YOUR_JWT_TOKEN
```

### **Endpoint Pubblici (solo API Key):**
- `POST /api/v2/auth/login`
- `POST /api/v2/auth/register-business`
- `POST /api/v2/auth/register-logistics`
- `GET /api/v1/auth/confirm` (conferma email)
- `POST /api/v1/auth/reset` (reset password)

### **Endpoint Protetti (API Key + JWT):**
- Tutti gli altri endpoint richiedono entrambi gli header

---

##  Guida Setup Frontend

### **1. Configurazione Iniziale**

**Variabili Ambiente (.env.local):**
```env
NEXT_PUBLIC_API_KEY=your_api_key_here
NEXT_PUBLIC_API_URL=https://your-api.com/api/v2
```

### **2. Setup Axios (Consigliato)**

```typescript
// lib/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.NEXT_PUBLIC_API_KEY, // ← API Key sempre presente
  },
});

// Interceptor per aggiungere JWT Token automaticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`; // ← JWT Token se presente
  }
  return config;
});

// Interceptor per refresh automatico token scaduto
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Se token scaduto (401) e non è già un retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Refresh token
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
          {},
          {
            headers: {
              'x-api-key': process.env.NEXT_PUBLIC_API_KEY,
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );
        
        // Salva nuovo token
        localStorage.setItem('token', data.token);
        
        // Riprova richiesta originale con nuovo token
        originalRequest.headers.Authorization = `Bearer ${data.token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh fallito, redirect a login
        localStorage.removeItem('token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
```

### **3. Esempio Login**

```typescript
// pages/login.tsx
import api from '@/lib/api';
import { useRouter } from 'next/router';

const LoginPage = () => {
  const router = useRouter();
  
  const handleLogin = async (email: string, password: string) => {
    try {
      const { data } = await api.post('/auth/login', {
        email,
        password,
      });
      
      // Salva token e dati utente
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('profile', JSON.stringify(data.profile));
      
      // Redirect basato su ruolo
      switch (data.user.role) {
        case 'BUSINESS':
          router.push('/dashboard/business');
          break;
        case 'LOGISTICS':
          router.push('/dashboard/logistics');
          break;
        case 'ADMIN':
          router.push('/dashboard/admin');
          break;
        default:
          router.push('/');
      }
    } catch (error) {
      console.error('Login failed:', error);
      alert('Credenziali non valide');
    }
  };
  
  return (
    // ... UI login form
  );
};
```

### **4. Esempio Chiamate API**

```typescript
// Tutte le chiamate usano automaticamente API Key + JWT Token

// Lista ordini
const getDeliveries = async () => {
  const { data } = await api.get('/business/deliveries');
  return data.deliveries;
};

// Crea ordine (businessId automatico da JWT!)
const createDelivery = async (orderData) => {
  const { data } = await api.post('/business/deliveries', {
    schedulingDelivery: '2025-03-12 21:00:00',
    customerName: 'Mario',
    customerSurname: 'Rossi',
    customerAddress: 'Via Cliente 456',
    paymentType: 'Contrassegno',
    totalPaid: 29.99,
    totalShipping: 5.00,
    // businessId NON serve! Preso automaticamente da JWT
  });
  return data;
};

// Approva raider (businessId automatico da JWT!)
const approveRaider = async (raiderId: string) => {
  const { data } = await api.post('/business/raiders/approve', {
    raiderId, // ← Solo raiderId, businessId automatico!
  });
  return data;
};

// Approva multipli raider
const approveMultipleRaiders = async (raiderIds: string[]) => {
  const { data } = await api.post('/business/raiders/approve', {
    raiderIds, // ← Array di raider
  });
  return data;
};
```

### **5. Hook Personalizzato (Opzionale)**

```typescript
// hooks/useAuth.ts
import { useState, useEffect } from 'react';
import api from '@/lib/api';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Carica dati da localStorage
    const storedUser = localStorage.getItem('user');
    const storedProfile = localStorage.getItem('profile');
    
    if (storedUser) setUser(JSON.parse(storedUser));
    if (storedProfile) setProfile(JSON.parse(storedProfile));
    
    setLoading(false);
  }, []);
  
  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('profile', JSON.stringify(data.profile));
    
    setUser(data.user);
    setProfile(data.profile);
    
    return data;
  };
  
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('profile');
    
    setUser(null);
    setProfile(null);
    
    window.location.href = '/login';
  };
  
  return { user, profile, loading, login, logout };
};
```

### **6. Protezione Route**

```typescript
// components/ProtectedRoute.tsx
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export const ProtectedRoute = ({ 
  children, 
  allowedRoles = [] 
}: { 
  children: React.ReactNode;
  allowedRoles?: string[];
}) => {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        router.push('/unauthorized');
      }
    }
  }, [user, loading, router, allowedRoles]);
  
  if (loading) return <div>Loading...</div>;
  if (!user) return null;
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) return null;
  
  return <>{children}</>;
};

// Uso:
// <ProtectedRoute allowedRoles={['BUSINESS']}>
//   <BusinessDashboard />
// </ProtectedRoute>
```

---

## 🔑 IMPORTANTE: ID Automatici dal JWT

**Tutti gli endpoint protetti prendono l'ID automaticamente dal JWT Token:**

### **Business Endpoints:**
```typescript
//  SBAGLIATO - Non serve passare businessId
await api.post('/business/deliveries', {
  businessId: 'xxx', // ← NON SERVE!
  customerName: 'Mario',
});

//  CORRETTO - businessId preso da JWT
await api.post('/business/deliveries', {
  customerName: 'Mario', // ← Solo i dati ordine
  // businessId automatico dal token!
});
```

### **Logistics Endpoints:**
```typescript
//  SBAGLIATO - Non serve passare logisticsId
await api.post('/logistics/deliveries', {
  logisticsId: 'xxx', // ← NON SERVE!
  businessId: 'business_id',
  customerName: 'Mario',
});

//  CORRETTO - logisticsId preso da JWT
await api.post('/logistics/deliveries', {
  businessId: 'business_id', // ← Solo businessId target
  customerName: 'Mario',
  // logisticsId automatico dal token!
});
```

### **Admin Endpoints:**
```typescript
// Admin può specificare tutto manualmente
await api.post('/admin/raiders', {
  email: 'raider@example.com',
  assignToBusinessIds: ['bus1', 'bus2'], // ← Admin sceglie
  // Admin ha accesso completo
});
```

---

**Come funziona internamente:**

1. Frontend invia richiesta con `Authorization: Bearer TOKEN`
2. Backend decodifica JWT → estrae `userId`
3. Backend cerca profilo dell'utente in base al ruolo:
   - **BUSINESS** → `auth.business.id`
   - **LOGISTICS** → `auth.logistics.id`
   - **ADMIN** → `auth.user.id`
4. Backend usa automaticamente l'ID del profilo
5.  Ogni ruolo vede solo i PROPRI dati

---

**Vantaggi per ruolo:**

### **Business:**
-  Sicurezza: Vede solo i SUOI ordini e raider
-  Semplicità: Non serve passare businessId
-  Automatico: businessId sempre corretto

### **Logistics:**
-  Sicurezza: Vede solo i business ASSEGNATI
-  Controllo: Può creare ordini solo per business assegnati
-  Automatico: logisticsId sempre corretto

### **Admin:**
-  Accesso completo: Vede tutto il sistema
-  Flessibilità: Può specificare qualsiasi ID
-  Controllo totale: Nessuna restrizione

---

##  Endpoints per Ruolo

### **BUSINESS** - Dashboard Attività
- Gestione ordini
- Gestione raider abilitati
- Statistiche

### **LOGISTICS** - Gestione Multi-Business
- Vista globale ordini
- Gestione business
- Assegnazioni massive

### **ADMIN** - Amministrazione
- Gestione utenti
- Cambio ruoli

---

## 📋 AUTH - Autenticazione

**Endpoint disponibili:**
- `POST /api/v2/auth/login` - Login
- `POST /api/v2/auth/refresh` - Refresh token
- `GET /api/v2/auth/me` - Info utente corrente
- `POST /api/v2/auth/register-business` - Registra business
- `POST /api/v2/auth/register-logistics` - Registra logistics

---

### `POST /api/v2/auth/login`
Login universale con info ruolo

**Body:**
```json
{
  "email": "business@example.com",
  "password": "password123"
}
```

**Response 200:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "email": "business@example.com",
    "role": "BUSINESS"
  },
  "profile": {
    "type": "business",
    "id": "business_id",
    "name": "Nome Attività",
    "address": "Via Example 123"
  }
}
```

---

---

### `POST /api/v2/auth/refresh`
Refresh JWT token (quando sta per scadere o è scaduto)

**Headers:**
```
Authorization: Bearer OLD_TOKEN
```

**Response 200:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "email": "business@example.com",
    "role": "BUSINESS"
  },
  "profile": {
    "type": "business",
    "id": "business_id",
    "name": "La Mia Pizzeria",
    "address": "Via Roma 123"
  }
}
```

**Uso Frontend:**
```typescript
// Quando token sta per scadere (es. ogni 20 ore)
const refreshToken = async () => {
  const oldToken = localStorage.getItem('token');
  
  const response = await fetch('/api/v2/auth/refresh', {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'Authorization': `Bearer ${oldToken}`
    }
  });
  
  const data = await response.json();
  localStorage.setItem('token', data.token);
};
```

---

### `GET /api/v2/auth/me`
Ottieni info utente autenticato corrente

**Headers:**
```
Authorization: Bearer TOKEN
```

**Response 200:**
```json
{
  "user": {
    "id": "user_id",
    "email": "business@example.com",
    "role": "BUSINESS",
    "confirmed": true
  },
  "profile": {
    "type": "business",
    "id": "business_id",
    "name": "La Mia Pizzeria",
    "address": "Via Roma 123"
  }
}
```

**Uso Frontend:**
```typescript
// All'avvio app per verificare sessione
const checkAuth = async () => {
  const token = localStorage.getItem('token');
  
  const response = await fetch('/api/v2/auth/me', {
    headers: {
      'x-api-key': API_KEY,
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (response.ok) {
    const data = await response.json();
    // Utente ancora autenticato
    setUser(data.user);
    setProfile(data.profile);
  } else {
    // Token scaduto, redirect a login
    router.push('/login');
  }
};
```

---

### `POST /api/v2/auth/register-business`
Registrazione nuovo business

**Body:**
```json
{
  "email": "business@example.com",
  "password": "password123",
  "bussinesName": "Nome Attività",
  "address": "Via Example 123, 00100 Roma",
  "businessCord": "41.9028,12.4964"
}
```

**Response 201:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Registrazione completata. Controlla la tua email per confermare l'account.",
  "user": {
    "id": "user_id",
    "email": "business@example.com",
    "role": "BUSINESS"
  },
  "business": {
    "id": "business_id",
    "name": "Nome Attività",
    "address": "Via Example 123, 00100 Roma"
  }
}
```

---

## 🏢 BUSINESS - Dashboard Attività

### Profilo

#### `GET /api/v2/business/profile`
Ottieni profilo business autenticato

**Headers:** `Authorization: Bearer TOKEN`

**Response 200:**
```json
{
  "user": {
    "id": "user_id",
    "email": "business@example.com",
    "role": "BUSINESS"
  },
  "business": {
    "id": "business_id",
    "name": "Nome Attività",
    "address": "Via Example 123",
    "coordinates": "41.9028,12.4964",
    "raiderActived": ["raider_id_1", "raider_id_2"],
    "createdAt": "2025-01-01T10:00:00.000Z"
  }
}
```

---

#### `PUT /api/v2/business/profile`
Aggiorna profilo business

**Body:**
```json
{
  "bussinesName": "Nuovo Nome",
  "address": "Nuovo Indirizzo",
  "businessCord": "41.9028,12.4964"
}
```

**Response 200:**
```json
{
  "message": "Profilo aggiornato con successo",
  "business": { ... }
}
```

---

### Ordini

#### `GET /api/v2/business/deliveries`
Lista ordini del business

**Query Parameters:**
- `status` - Filtra per status (CREATED, ASSIGNED, ONDELIVERY, COMPLETED, etc.)
- `raiderId` - Filtra per raider assegnato
- `dateFrom` - Data inizio (ISO 8601)
- `dateTo` - Data fine (ISO 8601)
- `limit` - Numero risultati (default: 50)
- `offset` - Offset paginazione (default: 0)

**Example:**
```
GET /api/v2/business/deliveries?status=ASSIGNED&limit=20&offset=0
```

**Response 200:**
```json
{
  "deliveries": [
    {
      "id": "delivery_id",
      "orderId": "ORD-123",
      "name": "Nome Attività",
      "recipient": "Mario Rossi",
      "deliveryAddress": "Via Cliente 456",
      "schedulingDelivery": "2025-03-12T21:00:00.000Z",
      "status": "ASSIGNED",
      "compensation": 5.23,
      "totalPaid": 29.23,
      "assignedToRaider": {
        "id": "raider_id",
        "name": "Giovanni",
        "surname": "Verdi",
        "vehicle": "CAR"
      },
      "createdAt": "2025-03-10T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

---

#### `POST /api/v2/business/deliveries`
Crea nuovo ordine

**Body:**
```json
{
  "orderId": "ORD-123",
  "schedulingDelivery": "2025-03-12 21:00:00",
  "customerName": "Mario",
  "customerSurname": "Rossi",
  "customerAddress": "Via Cliente 456, 00100 Roma",
  "paymentType": "Contrassegno",
  "totalPaid": 29.23,
  "totalShipping": 5.23,
  "mobile": "3331234567",
  "note": "Citofono rotto",
  "customerCoordinates": "41.9028,12.4964",
  "assignToRaiderId": "raider_id_optional"
}
```

**Response 201:**
```json
{
  "result": "success",
  "message": "Ordine creato con successo",
  "delivery": { ... },
  "assigned": true,
  "assignedTo": "raider_id"
}
```

---

#### `GET /api/v2/business/deliveries/:id`
Dettaglio singolo ordine

**Response 200:**
```json
{
  "delivery": {
    "id": "delivery_id",
    "orderId": "ORD-123",
    "name": "Nome Attività",
    "recipient": "Mario Rossi",
    "deliveryAddress": "Via Cliente 456",
    "customerCoordinates": "41.9028,12.4964",
    "mobile": "3331234567",
    "schedulingDelivery": "2025-03-12T21:00:00.000Z",
    "status": "ASSIGNED",
    "compensation": 5.23,
    "totalPaid": 29.23,
    "note": "Citofono rotto",
    "assignedToRaider": {
      "id": "raider_id",
      "name": "Giovanni",
      "surname": "Verdi",
      "vehicle": "CAR",
      "user": {
        "email": "raider@example.com"
      }
    }
  }
}
```

---

#### `PUT /api/v2/business/deliveries/:id`
Modifica ordine (solo se non ancora assegnato o in CREATED)

**Body:**
```json
{
  "schedulingDelivery": "2025-03-12 22:00:00",
  "note": "Nuova nota",
  "compensation": 6.00,
  "mobile": "3339876543"
}
```

**Response 200:**
```json
{
  "message": "Ordine aggiornato con successo",
  "delivery": { ... }
}
```

---

#### `DELETE /api/v2/business/deliveries/:id`
Cancella ordine (solo se non assegnato)

**Response 200:**
```json
{
  "message": "Ordine cancellato con successo"
}
```

---

#### `POST /api/v2/business/deliveries/:id/reassign`
Riassegna ordine a un altro raider

**Body:**
```json
{
  "newRaiderId": "new_raider_id"
}
```

**Response 200:**
```json
{
  "message": "Ordine riassegnato con successo",
  "oldRaiderId": "old_raider_id",
  "newRaiderId": "new_raider_id"
}
```

---

### Raider

#### `GET /api/v2/business/raiders`
Lista raider del business

**Query Parameters:**
- `status` - Filtra per status: `confirmed`, `pending`, `all` (default: all)

**Example:**
```
GET /api/v2/business/raiders?status=confirmed
```

**Response 200:**
```json
{
  "raiders": [
    {
      "relationId": "relation_id",
      "raiderId": "raider_id",
      "name": "Giovanni",
      "surname": "Verdi",
      "vehicle": "CAR",
      "isActive": true,
      "inService": true,
      "confirmedFromBusiness": true,
      "email": "raider@example.com",
      "createdAt": "2025-01-01T10:00:00.000Z"
    }
  ]
}
```

---

#### `GET /api/v2/business/raiders/pending`
Lista richieste di abilitazione pending

**Response 200:**
```json
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

---

#### `POST /api/v2/business/raiders/approve`
Approva raider in attesa (singolo o multipli)

**Body (singolo):**
```json
{
  "raiderId": "raider_id"
}
```

**Body (multipli):**
```json
{
  "raiderIds": ["raider_id_1", "raider_id_2"]
}
```

**Response 200:**
```json
{
  "message": "2 raider approvati con successo",
  "approvedRaiderIds": ["raider_id_1", "raider_id_2"]
}
```

---

#### `POST /api/v2/business/raiders`
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

**Response 201:**
```json
{
  "message": "Raider creato con successo",
  "raider": {
    "id": "raider_id",
    "name": "Mario",
    "surname": "Rossi",
    "vehicle": "MOTORCYCLE",
    "mobile": "3331234567",
    "email": "raider@example.com"
  }
}
```

---

#### `PUT /api/v2/business/raiders/:id`
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

**Response 200:**
```json
{
  "message": "Raider aggiornato con successo",
  "raider": {
    "id": "raider_id",
    "name": "Mario",
    "surname": "Rossi",
    "vehicle": "CAR",
    "mobile": "3331234567",
    "email": "raider@example.com"
  }
}
```

---

#### `DELETE /api/v2/business/raiders/remove`
Rimuovi raider dal business (singolo o multipli)

**Body (singolo):**
```json
{
  "raiderId": "raider_id"
}
```

**Body (multipli):**
```json
{
  "raiderIds": ["raider_id_1", "raider_id_2"]
}
```

**Response 200:**
```json
{
  "message": "2 raider rimossi con successo",
  "removedRaiderIds": ["raider_id_1", "raider_id_2"]
}
```

---

### Statistiche

#### `GET /api/v2/business/stats`
Statistiche business

**Query Parameters:**
- `dateFrom` - Data inizio (ISO 8601)
- `dateTo` - Data fine (ISO 8601)

**Response 200:**
```json
{
  "period": {
    "from": "2025-01-01",
    "to": "2025-03-31"
  },
  "orders": {
    "total": 150,
    "byStatus": {
      "created": 10,
      "assigned": 20,
      "onDelivery": 5,
      "completed": 110,
      "notDelivered": 3,
      "cancelled": 2
    }
  },
  "financial": {
    "totalRevenue": "4384.50",
    "totalCompensation": "784.50",
    "completedCompensation": "575.30",
    "netProfit": "3809.20"
  },
  "raiders": {
    "total": 5,
    "performance": [
      {
        "raiderId": "raider_id",
        "raiderName": "Giovanni Verdi",
        "totalAssigned": 45,
        "completed": 43,
        "notDelivered": 2,
        "successRate": "95.56%"
      }
    ]
  }
}
```

---

## 🚚 LOGISTICS - Gestione Multi-Business (Multi-Tenant)

**IMPORTANTE:** Ogni utente Logistics vede **SOLO i business assegnati a lui** dall'Admin.

### Business

#### `GET /api/v2/logistics/businesses`
Lista business assegnati al logistics

**Query Parameters:**
- `search` - Cerca per nome o indirizzo
- `limit` - Numero risultati (default: 50)
- `offset` - Offset paginazione (default: 0)

**Response 200:**
```json
{
  "businesses": [
    {
      "id": "business_id",
      "name": "Nome Attività",
      "address": "Via Example 123",
      "coordinates": "41.9028,12.4964",
      "email": "business@example.com",
      "confirmed": true,
      "activeRaiders": 5,
      "stats": {
        "totalOrders": 150,
        "completedOrders": 110
      },
      "createdAt": "2025-01-01T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 50,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

---

#### `POST /api/v2/logistics/businesses`
Crea nuovo business

**Body:**
```json
{
  "email": "newbusiness@example.com",
  "password": "password123",
  "bussinesName": "Nuova Attività",
  "address": "Via Nuova 789",
  "businessCord": "41.9028,12.4964"
}
```

**Response 201:**
```json
{
  "message": "Business creato con successo",
  "business": {
    "id": "business_id",
    "name": "Nuova Attività",
    "address": "Via Nuova 789",
    "email": "newbusiness@example.com"
  }
}
```

---

#### `GET /api/v2/logistics/businesses/:id`
Dettaglio business

**Response 200:**
```json
{
  "business": {
    "id": "business_id",
    "bussinesName": "Nome Attività",
    "address": "Via Example 123",
    "businessCord": "41.9028,12.4964",
    "user": {
      "email": "business@example.com",
      "confirmed": true
    },
    "raiderRelations": [
      {
        "raider": {
          "id": "raider_id",
          "name": "Giovanni",
          "surname": "Verdi",
          "vehicle": "CAR",
          "isActive": true
        },
        "confirmedFromBusiness": true
      }
    ],
    "deliveries": [ ... ]
  }
}
```

---

#### `PUT /api/v2/logistics/businesses/:id`
Modifica business

**Body:**
```json
{
  "bussinesName": "Nome Aggiornato",
  "address": "Nuovo Indirizzo",
  "businessCord": "41.9028,12.4964"
}
```

---

### Raider

#### `GET /api/v2/logistics/raiders`
Lista tutti i raider

**Query Parameters:**
- `search` - Cerca per nome o cognome
- `isActive` - Filtra per attivi (true/false)
- `limit` - Numero risultati (default: 50)
- `offset` - Offset paginazione (default: 0)

**Response 200:**
```json
{
  "raiders": [
    {
      "id": "raider_id",
      "name": "Giovanni",
      "surname": "Verdi",
      "vehicle": "CAR",
      "isActive": true,
      "inService": true,
      "email": "raider@example.com",
      "confirmed": true,
      "businesses": [
        {
          "id": "business_id",
          "name": "Nome Attività"
        }
      ],
      "totalBusinesses": 3,
      "createdAt": "2025-01-01T10:00:00.000Z"
    }
  ],
  "pagination": { ... }
}
```

---

#### `POST /api/v2/logistics/raiders`
Crea nuovo raider della logistica

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

**Response 201:**
```json
{
  "message": "Raider creato con successo",
  "raider": {
    "id": "raider_id",
    "name": "Mario",
    "surname": "Rossi",
    "vehicle": "MOTORCYCLE",
    "mobile": "3331234567",
    "email": "raider@example.com"
  }
}
```

---

#### `POST /api/v2/logistics/raiders/assign`
Assegna raider ai business

**Body:**
```json
{
  "raiderId": "raider_id",
  "businessIds": ["business_id_1", "business_id_2"]
}
```

**Response 200:**
```json
{
  "message": "Raider assegnato a 2 business con successo",
  "raiderId": "raider_id",
  "assignedBusinessIds": ["business_id_1", "business_id_2"]
}
```

---

#### `PUT /api/v2/logistics/raiders/:id`
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

**Response 200:**
```json
{
  "message": "Raider aggiornato con successo",
  "raider": {
    "id": "raider_id",
    "name": "Mario",
    "surname": "Rossi",
    "vehicle": "CAR",
    "mobile": "3331234567",
    "email": "raider@example.com"
  }
}
```

---

### Ordini

#### `GET /api/v2/logistics/deliveries`
Vista ordini dei business assegnati al logistics

**Query Parameters:**
- `status` - Filtra per status
- `businessId` - Filtra per business
- `raiderId` - Filtra per raider
- `dateFrom` - Data inizio
- `dateTo` - Data fine
- `limit` - Numero risultati (default: 50)
- `offset` - Offset paginazione (default: 0)

**Response 200:**
```json
{
  "deliveries": [
    {
      "id": "delivery_id",
      "orderId": "ORD-123",
      "recipient": "Mario Rossi",
      "status": "ASSIGNED",
      "business": {
        "id": "business_id",
        "bussinesName": "Nome Attività"
      },
      "assignedToRaider": {
        "id": "raider_id",
        "name": "Giovanni",
        "surname": "Verdi"
      },
      "schedulingDelivery": "2025-03-12T21:00:00.000Z"
    }
  ],
  "pagination": { ... }
}
```

---

#### `POST /api/v2/logistics/deliveries`
Crea ordine per uno dei business assegnati

**Body:**
```json
{
  "businessId": "business_id",
  "orderId": "ORD-123",
  "schedulingDelivery": "2025-03-12 21:00:00",
  "customerName": "Mario",
  "customerSurname": "Rossi",
  "customerAddress": "Via Cliente 456, Milano",
  "paymentType": "Contrassegno",
  "totalPaid": 29.99,
  "totalShipping": 5.00,
  "mobile": "3331234567",
  "note": "Citofono rotto"
}
```

**Response 201:**
```json
{
  "message": "Ordine creato con successo",
  "delivery": {
    "id": "delivery_id",
    "orderId": "ORD-123",
    "businessName": "Pizzeria Roma",
    "customerName": "Mario",
    "customerSurname": "Rossi",
    "customerAddress": "Via Cliente 456, Milano",
    "schedulingDelivery": "2025-03-12T21:00:00.000Z",
    "status": "CREATED"
  }
}
```

---

#### `POST /api/v2/logistics/deliveries/assign-bulk`
Assegna multipli ordini a un raider

**Body:**
```json
{
  "deliveryIds": ["delivery_id_1", "delivery_id_2", "delivery_id_3"],
  "raiderId": "raider_id"
}
```

**Response 200:**
```json
{
  "message": "3 ordini assegnati con successo",
  "assignedDeliveryIds": ["delivery_id_1", "delivery_id_2", "delivery_id_3"],
  "raiderId": "raider_id"
}
```

---

### Statistiche

#### `GET /api/v2/logistics/stats/global`
Statistiche dei business assegnati al logistics

**Query Parameters:**
- `dateFrom` - Data inizio
- `dateTo` - Data fine

**Response 200:**
```json
{
  "period": {
    "from": "All time",
    "to": "Now"
  },
  "overview": {
    "totalBusinesses": 5,
    "totalDeliveries": 500,
    "completedDeliveries": 450,
    "ongoingDeliveries": 15
  },
  "financial": {
    "totalRevenue": "145000.00",
    "totalCompensation": "25000.00",
    "netProfit": "120000.00"
  }
}
```

---

## 👨‍💼 ADMIN - Amministrazione

### Logistics

#### `GET /api/v2/admin/logistics`
Lista tutti i logistics con business assegnati

**Query Parameters:**
- `limit` - Numero risultati (default: 50)
- `offset` - Offset paginazione (default: 0)

**Response 200:**
```json
{
  "logistics": [
    {
      "id": "logistics_id",
      "name": "Mario",
      "surname": "Rossi",
      "email": "logistics@example.com",
      "confirmed": true,
      "expired": false,
      "assignedBusinesses": [
        {
          "id": "business_id_1",
          "name": "Pizzeria Roma",
          "address": "Via Roma 123"
        },
        {
          "id": "business_id_2",
          "name": "Ristorante Milano",
          "address": "Via Milano 456"
        }
      ],
      "totalBusinesses": 2,
      "createdAt": "2025-01-01T10:00:00.000Z"
    }
  ],
  "pagination": { ... }
}
```

---

#### `POST /api/v2/admin/logistics/assign-businesses`
Assegna business a logistics

**Body:**
```json
{
  "logisticsId": "logistics_id",
  "businessIds": ["business_id_1", "business_id_2", "business_id_3"]
}
```

**Response 200:**
```json
{
  "message": "3 business assegnati con successo",
  "logisticsId": "logistics_id",
  "assignedBusinessIds": ["business_id_1", "business_id_2", "business_id_3"]
}
```

---

#### `DELETE /api/v2/admin/logistics/remove-businesses`
Rimuovi business da logistics

**Body:**
```json
{
  "logisticsId": "logistics_id",
  "businessIds": ["business_id_1"]
}
```

**Response 200:**
```json
{
  "message": "Business rimossi dal logistics",
  "logisticsId": "logistics_id",
  "removedBusinessIds": ["business_id_1"]
}
```

---

### Utenti

#### `GET /api/v2/admin/users`
Lista utenti

**Query Parameters:**
- `role` - Filtra per ruolo (ADMIN, BUSINESS, RAIDER, LOGISTICS, USER)
- `limit` - Numero risultati (default: 50)
- `offset` - Offset paginazione (default: 0)

**Response 200:**
```json
{
  "users": [
    {
      "id": "user_id",
      "email": "user@example.com",
      "role": "BUSINESS",
      "confirmed": true,
      "expired": false,
      "creatdeAt": "2025-01-01T10:00:00.000Z",
      "businessProfiles": [
        {
          "id": "business_id",
          "bussinesName": "Nome Attività"
        }
      ]
    }
  ],
  "pagination": { ... }
}
```

---

#### `PUT /api/v2/admin/users/:id/role`
Cambia ruolo utente

**Body:**
```json
{
  "role": "LOGISTICS"
}
```

**Ruoli validi:** `ADMIN`, `USER`, `LOGISTICS`, `BUSINESS`, `RAIDER`

**Response 200:**
```json
{
  "message": "Ruolo aggiornato con successo",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "role": "LOGISTICS"
  }
}
```

---

#### `PUT /api/v2/admin/users/:id/status`
Attiva/Disattiva utente

**Body:**
```json
{
  "expired": true
}
```

**Response 200:**
```json
{
  "message": "Utente disattivato",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "expired": true
  }
}
```

---

### Business (Admin)

#### `GET /api/v2/admin/businesses`
Lista tutti i business (Admin vede tutto)

**Query Parameters:**
- `search` - Cerca per nome o indirizzo
- `limit` - Numero risultati (default: 50)
- `offset` - Offset paginazione (default: 0)

**Response 200:**
```json
{
  "businesses": [
    {
      "id": "business_id",
      "name": "Pizzeria Roma",
      "address": "Via Roma 123",
      "coordinates": "41.9028,12.4964",
      "email": "business@example.com",
      "confirmed": true,
      "expired": false,
      "activeRaiders": 5,
      "assignedLogistics": [
        {
          "id": "logistics_id",
          "name": "Mario Rossi"
        }
      ],
      "stats": {
        "totalOrders": 150,
        "completedOrders": 110
      },
      "createdAt": "2025-01-01T10:00:00.000Z"
    }
  ],
  "pagination": { ... }
}
```

---

#### `POST /api/v2/admin/businesses`
Crea nuovo business

**Body:**
```json
{
  "email": "newbusiness@example.com",
  "password": "password123",
  "bussinesName": "Nuova Pizzeria",
  "address": "Via Nuova 789",
  "businessCord": "41.9028,12.4964"
}
```

**Response 201:**
```json
{
  "message": "Business creato con successo",
  "business": {
    "id": "business_id",
    "name": "Nuova Pizzeria",
    "address": "Via Nuova 789",
    "email": "newbusiness@example.com"
  }
}
```

---

#### `GET /api/v2/admin/businesses/:id`
Dettaglio business completo

**Response 200:**
```json
{
  "business": {
    "id": "business_id",
    "bussinesName": "Pizzeria Roma",
    "address": "Via Roma 123",
    "user": { ... },
    "raiderRelations": [ ... ],
    "deliveries": [ ... ],
    "logisticsRelations": [
      {
        "logistics": {
          "id": "logistics_id",
          "name": "Mario",
          "surname": "Rossi"
        }
      }
    ]
  }
}
```

---

#### `PUT /api/v2/admin/businesses/:id`
Modifica business

**Body:**
```json
{
  "bussinesName": "Nuovo Nome",
  "address": "Nuovo Indirizzo",
  "businessCord": "41.9028,12.4964"
}
```

---

#### `DELETE /api/v2/admin/businesses/:id`
Disabilita business

**Response 200:**
```json
{
  "message": "Business disabilitato con successo"
}
```

---

### Raider (Admin)

#### `GET /api/v2/admin/raiders`
Lista tutti i raider (Admin vede tutto)

**Query Parameters:**
- `search` - Cerca per nome o cognome
- `isActive` - Filtra per attivi (true/false)
- `limit` - Numero risultati (default: 50)
- `offset` - Offset paginazione (default: 0)

**Response 200:**
```json
{
  "raiders": [
    {
      "id": "raider_id",
      "name": "Giovanni",
      "surname": "Verdi",
      "vehicle": "CAR",
      "isActive": true,
      "inService": true,
      "email": "raider@example.com",
      "confirmed": true,
      "expired": false,
      "businesses": [
        {
          "id": "business_id",
          "name": "Pizzeria Roma"
        }
      ],
      "totalBusinesses": 3,
      "currentAssignments": 2,
      "createdAt": "2025-01-01T10:00:00.000Z"
    }
  ],
  "pagination": { ... }
}
```

---

#### `GET /api/v2/admin/raiders/:id`
Dettaglio raider completo

**Response 200:**
```json
{
  "raider": {
    "id": "raider_id",
    "name": "Giovanni",
    "surname": "Verdi",
    "vehicle": "CAR",
    "isActive": true,
    "inService": true,
    "user": { ... },
    "businessRelations": [ ... ],
    "assignedDeliveries": [
      {
        "delivery": {
          "id": "delivery_id",
          "orderId": "ORD-123",
          "status": "ASSIGNED",
          "business": {
            "bussinesName": "Pizzeria Roma"
          }
        }
      }
    ]
  }
}
```

---

#### `POST /api/v2/admin/raiders`
Crea nuovo raider (Admin può creare per chiunque)

**Body:**
```json
{
  "email": "raider@example.com",
  "password": "password123",
  "name": "Mario",
  "surname": "Rossi",
  "vehicle": "MOTORCYCLE",
  "mobile": "3331234567",
  "assignToBusinessIds": ["business_id_1", "business_id_2"]
}
```

**Response 201:**
```json
{
  "message": "Raider creato con successo",
  "raider": {
    "id": "raider_id",
    "name": "Mario",
    "surname": "Rossi",
    "vehicle": "MOTORCYCLE",
    "mobile": "3331234567",
    "email": "raider@example.com",
    "assignedBusinesses": 2
  }
}
```

---

#### `PUT /api/v2/admin/raiders/:id`
Modifica raider (Admin può modificare qualsiasi raider)

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

**Response 200:**
```json
{
  "message": "Raider aggiornato con successo",
  "raider": {
    "id": "raider_id",
    "name": "Mario",
    "surname": "Rossi",
    "vehicle": "CAR",
    "mobile": "3331234567",
    "email": "newemail@example.com"
  }
}
```

---

#### `PUT /api/v2/admin/raiders/:id/status`
Attiva/Disattiva raider

**Body:**
```json
{
  "isActive": false
}
```

**Response 200:**
```json
{
  "message": "Raider disattivato",
  "raider": {
    "id": "raider_id",
    "name": "Giovanni",
    "surname": "Verdi",
    "isActive": false
  }
}
```

---

### Ordini (Admin)

#### `GET /api/v2/admin/deliveries`
Vista globale ordini (Admin vede tutto)

**Query Parameters:**
- `status` - Filtra per status
- `businessId` - Filtra per business
- `raiderId` - Filtra per raider
- `dateFrom` - Data inizio
- `dateTo` - Data fine
- `limit` - Numero risultati (default: 50)
- `offset` - Offset paginazione (default: 0)

**Response 200:**
```json
{
  "deliveries": [ ... ],
  "pagination": { ... }
}
```

---

### Statistiche (Admin)

#### `GET /api/v2/admin/stats`
Statistiche globali sistema

**Query Parameters:**
- `dateFrom` - Data inizio
- `dateTo` - Data fine

**Response 200:**
```json
{
  "period": {
    "from": "All time",
    "to": "Now"
  },
  "overview": {
    "totalUsers": 250,
    "totalBusinesses": 50,
    "totalLogistics": 10,
    "totalRaiders": 120,
    "activeRaiders": 85
  },
  "deliveries": {
    "total": 5000,
    "byStatus": {
      "created": 50,
      "assigned": 100,
      "onDelivery": 20,
      "completed": 4500,
      "notDelivered": 30
    }
  },
  "financial": {
    "totalRevenue": "145000.00",
    "totalCompensation": "25000.00",
    "completedCompensation": "23000.00",
    "netProfit": "122000.00"
  },
  "topBusinesses": [
    {
      "id": "business_id",
      "name": "Pizzeria Roma",
      "totalOrders": 500,
      "completedOrders": 480,
      "totalCompensation": 2500.00
    }
  ],
  "topRaiders": [
    {
      "id": "raider_id",
      "name": "Giovanni Verdi",
      "completedDeliveries": 450
    }
  ]
}
```

---

### Logistics Management (Admin)

#### `GET /api/v2/admin/logistics/:id`
Dettaglio logistics con business assegnati

**Response 200:**
```json
{
  "logistics": {
    "id": "logistics_id",
    "name": "Mario",
    "surname": "Rossi",
    "user": { ... },
    "businessRelations": [
      {
        "business": {
          "id": "business_id",
          "bussinesName": "Pizzeria Roma",
          "address": "Via Roma 123",
          "deliveries": [ ... ]
        }
      }
    ]
  }
}
```

---

#### `PUT /api/v2/admin/logistics/:id`
Modifica logistics

**Body:**
```json
{
  "name": "Nuovo Nome",
  "surname": "Nuovo Cognome"
}
```

---

#### `DELETE /api/v2/admin/logistics/:id`
Disabilita logistics

**Response 200:**
```json
{
  "message": "Logistics disabilitato con successo"
}
```

---

##  Codici di Errore

| Codice | Significato |
|--------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Dati mancanti o non validi |
| 401 | Unauthorized - Token mancante o non valido |
| 403 | Forbidden - Non hai i permessi per questa risorsa |
| 404 | Not Found - Risorsa non trovata |
| 409 | Conflict - Conflitto (es. ordine già assegnato) |
| 500 | Internal Server Error |

---

##  Note Importanti

### Stati Ordine
- `CREATED` - Ordine creato, non assegnato
- `RELEASED` - Ordine rilasciato da raider
- `ASSIGNED` - Ordine assegnato a raider
- `ONDELIVERY` - Raider in consegna
- `COMPLETED` - Consegna completata
- `NOTDELIVERED` - Consegna non effettuata
- `DELETED` - Ordine cancellato

### Veicoli Raider
- `CAR` - Auto
- `MOTORCYCLE` - Moto
- `BICYCLE` - Bicicletta
- `VAN` - Furgone
- `REFRIGERATEDVAN` - Furgone refrigerato
- `WITHOUTVEHICLE` - Senza veicolo
- `TRANSIT` - Mezzi pubblici

### Formato Date
Tutte le date sono in formato ISO 8601:
```
2025-03-12T21:00:00.000Z
```

Per creare ordini, puoi usare anche:
```
2025-03-12 21:00:00
```

---

##  Quick Start

### 1. Registra Business
```bash
curl -X POST https://your-api.com/api/v2/auth/register-business \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "business@example.com",
    "password": "password123",
    "bussinesName": "La Mia Pizzeria",
    "address": "Via Roma 123, Milano"
  }'
```

### 2. Login
```bash
curl -X POST https://your-api.com/api/v2/auth/login \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "business@example.com",
    "password": "password123"
  }'
```

### 3. Crea Ordine
```bash
curl -X POST https://your-api.com/api/v2/business/deliveries \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "schedulingDelivery": "2025-03-12 21:00:00",
    "customerName": "Mario",
    "customerSurname": "Rossi",
    "customerAddress": "Via Cliente 456, Milano",
    "paymentType": "Contrassegno",
    "totalPaid": 29.23,
    "totalShipping": 5.23,
    "mobile": "3331234567"
  }'
```

---

## 💡 Esempi Completi Frontend

### **Esempio 1: Dashboard Business - Lista Ordini**

```typescript
// pages/dashboard/business/orders.tsx
import { useState, useEffect } from 'react';
import api from '@/lib/api';

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    date: '',
  });
  
  useEffect(() => {
    fetchOrders();
  }, [filters]);
  
  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      // Costruisci query params
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.date) params.append('date', filters.date);
      
      // Chiamata API (businessId automatico da JWT!)
      const { data } = await api.get(`/business/deliveries?${params}`);
      setOrders(data.deliveries);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <h1>I Miei Ordini</h1>
      
      {/* Filtri */}
      <select 
        value={filters.status} 
        onChange={(e) => setFilters({...filters, status: e.target.value})}
      >
        <option value="">Tutti</option>
        <option value="CREATED">Creati</option>
        <option value="ASSIGNED">Assegnati</option>
        <option value="COMPLETED">Completati</option>
      </select>
      
      {/* Lista ordini */}
      {loading ? (
        <p>Caricamento...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID Ordine</th>
              <th>Cliente</th>
              <th>Indirizzo</th>
              <th>Stato</th>
              <th>Totale</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id}>
                <td>{order.orderId}</td>
                <td>{order.customerName} {order.customerSurname}</td>
                <td>{order.customerAddress}</td>
                <td>{order.status}</td>
                <td>€{order.totalPaid}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
```

---

### **Esempio 2: Form Creazione Ordine**

```typescript
// components/CreateOrderForm.tsx
import { useState } from 'react';
import api from '@/lib/api';

const CreateOrderForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    schedulingDelivery: '',
    customerName: '',
    customerSurname: '',
    customerAddress: '',
    paymentType: 'Contrassegno',
    totalPaid: 0,
    totalShipping: 0,
    mobile: '',
    note: '',
  });
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // businessId automatico da JWT!
      const { data } = await api.post('/business/deliveries', formData);
      
      alert('Ordine creato con successo!');
      onSuccess(data.delivery);
      
      // Reset form
      setFormData({
        schedulingDelivery: '',
        customerName: '',
        customerSurname: '',
        customerAddress: '',
        paymentType: 'Contrassegno',
        totalPaid: 0,
        totalShipping: 0,
        mobile: '',
        note: '',
      });
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Errore nella creazione dell\'ordine');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <h2>Nuovo Ordine</h2>
      
      <input
        type="datetime-local"
        value={formData.schedulingDelivery}
        onChange={(e) => setFormData({...formData, schedulingDelivery: e.target.value})}
        required
      />
      
      <input
        type="text"
        placeholder="Nome cliente"
        value={formData.customerName}
        onChange={(e) => setFormData({...formData, customerName: e.target.value})}
        required
      />
      
      <input
        type="text"
        placeholder="Cognome cliente"
        value={formData.customerSurname}
        onChange={(e) => setFormData({...formData, customerSurname: e.target.value})}
        required
      />
      
      <input
        type="text"
        placeholder="Indirizzo completo"
        value={formData.customerAddress}
        onChange={(e) => setFormData({...formData, customerAddress: e.target.value})}
        required
      />
      
      <select
        value={formData.paymentType}
        onChange={(e) => setFormData({...formData, paymentType: e.target.value})}
      >
        <option value="Contrassegno">Contrassegno</option>
        <option value="Carta">Carta</option>
        <option value="Pagato">Già Pagato</option>
      </select>
      
      <input
        type="number"
        step="0.01"
        placeholder="Totale ordine"
        value={formData.totalPaid}
        onChange={(e) => setFormData({...formData, totalPaid: parseFloat(e.target.value)})}
        required
      />
      
      <input
        type="number"
        step="0.01"
        placeholder="Costo spedizione"
        value={formData.totalShipping}
        onChange={(e) => setFormData({...formData, totalShipping: parseFloat(e.target.value)})}
      />
      
      <input
        type="tel"
        placeholder="Telefono (opzionale)"
        value={formData.mobile}
        onChange={(e) => setFormData({...formData, mobile: e.target.value})}
      />
      
      <textarea
        placeholder="Note (opzionale)"
        value={formData.note}
        onChange={(e) => setFormData({...formData, note: e.target.value})}
      />
      
      <button type="submit" disabled={loading}>
        {loading ? 'Creazione...' : 'Crea Ordine'}
      </button>
    </form>
  );
};
```

---

### **Esempio 3: Gestione Raider**

```typescript
// pages/dashboard/business/raiders.tsx
import { useState, useEffect } from 'react';
import api from '@/lib/api';

const RaidersPage = () => {
  const [activeRaiders, setActiveRaiders] = useState([]);
  const [pendingRaiders, setPendingRaiders] = useState([]);
  const [selectedRaiders, setSelectedRaiders] = useState([]);
  
  useEffect(() => {
    fetchRaiders();
    fetchPending();
  }, []);
  
  const fetchRaiders = async () => {
    const { data } = await api.get('/business/raiders');
    setActiveRaiders(data.raiders);
  };
  
  const fetchPending = async () => {
    const { data } = await api.get('/business/raiders/pending');
    setPendingRaiders(data.requests);
  };
  
  // Approva singolo raider
  const approveSingle = async (raiderId) => {
    try {
      await api.post('/business/raiders/approve', { raiderId });
      alert('Raider approvato!');
      fetchRaiders();
      fetchPending();
    } catch (error) {
      console.error('Error approving raider:', error);
    }
  };
  
  // Approva multipli raider selezionati
  const approveSelected = async () => {
    if (selectedRaiders.length === 0) {
      alert('Seleziona almeno un raider');
      return;
    }
    
    try {
      await api.post('/business/raiders/approve', { 
        raiderIds: selectedRaiders 
      });
      alert(`${selectedRaiders.length} raider approvati!`);
      setSelectedRaiders([]);
      fetchRaiders();
      fetchPending();
    } catch (error) {
      console.error('Error approving raiders:', error);
    }
  };
  
  // Rimuovi raider
  const removeRaider = async (raiderId) => {
    if (!confirm('Sei sicuro di voler rimuovere questo raider?')) return;
    
    try {
      await api.delete('/business/raiders/remove', {
        data: { raiderId }
      });
      alert('Raider rimosso!');
      fetchRaiders();
    } catch (error) {
      console.error('Error removing raider:', error);
    }
  };
  
  return (
    <div>
      <h1>Gestione Raider</h1>
      
      {/* Richieste Pending */}
      <section>
        <h2>Richieste Pending ({pendingRaiders.length})</h2>
        
        {pendingRaiders.length > 0 && (
          <button onClick={approveSelected}>
            Approva Selezionati ({selectedRaiders.length})
          </button>
        )}
        
        <table>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRaiders(pendingRaiders.map(r => r.raiderId));
                    } else {
                      setSelectedRaiders([]);
                    }
                  }}
                />
              </th>
              <th>Nome</th>
              <th>Email</th>
              <th>Veicolo</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {pendingRaiders.map(raider => (
              <tr key={raider.raiderId}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedRaiders.includes(raider.raiderId)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRaiders([...selectedRaiders, raider.raiderId]);
                      } else {
                        setSelectedRaiders(selectedRaiders.filter(id => id !== raider.raiderId));
                      }
                    }}
                  />
                </td>
                <td>{raider.name} {raider.surname}</td>
                <td>{raider.email}</td>
                <td>{raider.vehicle}</td>
                <td>
                  <button onClick={() => approveSingle(raider.raiderId)}>
                    ✅ Approva
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      
      {/* Raider Attivi */}
      <section>
        <h2>Raider Attivi ({activeRaiders.length})</h2>
        
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Veicolo</th>
              <th>Status</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {activeRaiders.map(raider => (
              <tr key={raider.raiderId}>
                <td>{raider.name} {raider.surname}</td>
                <td>{raider.email}</td>
                <td>{raider.vehicle}</td>
                <td>
                  {raider.isActive ? (
                    <span style={{color: 'green'}}>🟢 Online</span>
                  ) : (
                    <span style={{color: 'red'}}>🔴 Offline</span>
                  )}
                </td>
                <td>
                  <button onClick={() => removeRaider(raider.raiderId)}>
                    🗑️ Rimuovi
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};
```

---

### **Esempio 4: Dashboard con Statistiche**

```typescript
// pages/dashboard/business/index.tsx
import { useState, useEffect } from 'react';
import api from '@/lib/api';

const BusinessDashboard = () => {
  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState('week');
  
  useEffect(() => {
    fetchStats();
  }, [period]);
  
  const fetchStats = async () => {
    const { data } = await api.get(`/business/stats?period=${period}`);
    setStats(data);
  };
  
  if (!stats) return <div>Caricamento...</div>;
  
  return (
    <div>
      <h1>Dashboard Business</h1>
      
      {/* Filtro periodo */}
      <select value={period} onChange={(e) => setPeriod(e.target.value)}>
        <option value="today">Oggi</option>
        <option value="week">Questa Settimana</option>
        <option value="month">Questo Mese</option>
      </select>
      
      {/* Cards statistiche */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px'}}>
        <div className="stat-card">
          <h3>Ordini Totali</h3>
          <p style={{fontSize: '2em'}}>{stats.totalDeliveries}</p>
        </div>
        
        <div className="stat-card">
          <h3>Completati</h3>
          <p style={{fontSize: '2em', color: 'green'}}>{stats.completedDeliveries}</p>
        </div>
        
        <div className="stat-card">
          <h3>In Corso</h3>
          <p style={{fontSize: '2em', color: 'orange'}}>{stats.pendingDeliveries}</p>
        </div>
        
        <div className="stat-card">
          <h3>Revenue</h3>
          <p style={{fontSize: '2em', color: 'blue'}}>€{stats.totalRevenue}</p>
        </div>
      </div>
      
      {/* Top raider */}
      {stats.topRaider && (
        <div>
          <h2>🏆 Top Raider</h2>
          <p>
            <strong>{stats.topRaider.name}</strong> - {stats.topRaider.deliveries} consegne
          </p>
        </div>
      )}
    </div>
  );
};
```

---

## 🔧 Troubleshooting

### **Errore 401 - Unauthorized**

```typescript
// Possibili cause:
// 1. API Key mancante o errata
// 2. JWT Token mancante o scaduto
// 3. Token non valido

// Soluzione:
// Verifica headers
console.log('API Key:', process.env.NEXT_PUBLIC_API_KEY);
console.log('Token:', localStorage.getItem('token'));

// Prova refresh token
await api.post('/auth/refresh');
```

### **Errore 403 - Forbidden**

```typescript
// Causa: Ruolo non autorizzato
// Es: BUSINESS prova ad accedere a endpoint ADMIN

// Soluzione:
// Verifica ruolo utente
const user = JSON.parse(localStorage.getItem('user'));
console.log('User role:', user.role);

// Redirect a dashboard corretta
if (user.role === 'BUSINESS') router.push('/dashboard/business');
```

### **businessId non trovato**

```typescript
// Causa: JWT Token non contiene businessId
// Possibile se utente non ha profilo Business

// Soluzione:
// Verifica profilo
const profile = JSON.parse(localStorage.getItem('profile'));
console.log('Profile:', profile);

if (!profile || profile.type !== 'business') {
  alert('Profilo business non trovato');
  router.push('/setup-profile');
}
```

---

---

##  Riepilogo Endpoint v2

### **BUSINESS (17 endpoint)**
- GET/POST/PUT/DELETE deliveries
- GET raiders, pending
- **POST raiders** (crea raider) ← NUOVO
- **PUT raiders/:id** (modifica raider) ← NUOVO
- POST raiders/approve
- DELETE raiders/remove
- GET/PUT profile
- GET stats

### **LOGISTICS (14 endpoint)**
- GET/PUT businesses
- GET deliveries
- **POST deliveries** (crea ordine) ← NUOVO
- POST deliveries/assign-bulk
- GET raiders
- **POST raiders** (crea raider) ← NUOVO
- **POST raiders/assign** (assegna a business) ← NUOVO
- **PUT raiders/:id** (modifica raider) ← NUOVO
- GET stats/global

### **ADMIN (21 endpoint)**
- GET/PUT/DELETE users
- GET/POST/PUT/DELETE businesses
- GET/POST/PUT/DELETE logistics
- POST logistics/assign-businesses
- POST logistics/remove-businesses
- GET raiders
- **POST raiders** (crea raider) ← NUOVO
- GET/PUT raiders/:id
- **PUT raiders/:id** (modifica raider) ← NUOVO
- PUT raiders/:id/status
- GET deliveries
- GET stats

### **AUTH (5 endpoint)**
- POST login
- POST refresh
- GET me
- POST register-business
- POST register-logistics

**TOTALE: 57 endpoint**

---

## Nuove Funzionalità v2

### **Business può:**
- Creare raider propri
- Modificare raider propri/assegnati
- Approvare/rimuovere raider
- Creare e gestire ordini

### **Logistics può:**
- Creare ordini per business assegnati
- Creare raider della logistica
- Assegnare raider ai business
- Modificare raider propri
- Vedere ordini business assegnati

### **Admin può:**
- Creare raider per chiunque
- Modificare qualsiasi raider (anche email)
- Gestire tutto il sistema

---

**Versione:** 2.0  
**Ultimo aggiornamento:** 2025-10-02  