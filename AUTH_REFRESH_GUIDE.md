# 🔄 Sistema Refresh Token JWT

## ✅ Endpoint Auth Completi

### **1. Login**
`POST /api/v2/auth/login`

### **2. Refresh Token** ⭐ NUOVO
`POST /api/v2/auth/refresh`

### **3. Info Utente Corrente** ⭐ NUOVO
`GET /api/v2/auth/me`

---

## 🔐 Come Funziona il Refresh

### **Problema:**
I JWT hanno scadenza (24 ore). Quando scadono, l'utente deve rifare login.

### **Soluzione:**
Prima che scada, il frontend chiama `/refresh` per ottenere un nuovo token.

---

## 📱 Implementazione Frontend

### **1. Setup Axios Interceptor (Automatico)**

```typescript
// lib/axios.ts
import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v2',
  headers: {
    'x-api-key': process.env.NEXT_PUBLIC_API_KEY!
  }
});

// Aggiungi token a ogni richiesta
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Gestisci errori 401 (token scaduto)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Se 401 e non è già un retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Prova refresh
        const oldToken = localStorage.getItem('token');
        const response = await axios.post('/api/v2/auth/refresh', {}, {
          headers: {
            'x-api-key': process.env.NEXT_PUBLIC_API_KEY!,
            'Authorization': `Bearer ${oldToken}`
          }
        });

        const { token } = response.data;
        
        // Salva nuovo token
        localStorage.setItem('token', token);
        
        // Riprova richiesta originale con nuovo token
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh fallito, logout
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

---

### **2. Refresh Automatico con Timer**

```typescript
// hooks/useAutoRefresh.ts
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function useAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    // Refresh ogni 20 ore (4 ore prima della scadenza)
    const refreshInterval = setInterval(async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const response = await fetch('/api/v2/auth/refresh', {
          method: 'POST',
          headers: {
            'x-api-key': process.env.NEXT_PUBLIC_API_KEY!,
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          localStorage.setItem('token', data.token);
          console.log('Token refreshed successfully');
        } else {
          // Refresh fallito, logout
          localStorage.removeItem('token');
          localStorage.removeItem('userRole');
          router.push('/login');
        }
      } catch (error) {
        console.error('Refresh error:', error);
        router.push('/login');
      }
    }, 20 * 60 * 60 * 1000); // 20 ore

    return () => clearInterval(refreshInterval);
  }, [router]);
}
```

**Uso:**
```typescript
// app/layout.tsx o dashboard layout
'use client';

import { useAutoRefresh } from '@/hooks/useAutoRefresh';

export default function DashboardLayout({ children }) {
  useAutoRefresh(); // Attiva refresh automatico

  return <div>{children}</div>;
}
```

---

### **3. Verifica Sessione all'Avvio**

```typescript
// hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      router.push('/login');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/v2/auth/me', {
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY!,
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        localStorage.setItem('userRole', data.user.role);
      } else {
        // Token non valido, prova refresh
        const refreshResponse = await fetch('/api/v2/auth/refresh', {
          method: 'POST',
          headers: {
            'x-api-key': process.env.NEXT_PUBLIC_API_KEY!,
            'Authorization': `Bearer ${token}`
          }
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          localStorage.setItem('token', refreshData.token);
          setUser(refreshData.user);
        } else {
          router.push('/login');
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  return { user, loading };
}
```

**Uso:**
```typescript
// app/dashboard/business/page.tsx
'use client';

import { useAuth } from '@/hooks/useAuth';

export default function BusinessDashboard() {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return null; // Redirect in corso

  return <div>Welcome {user.email}</div>;
}
```

---

## 🔄 Flussi Refresh

### **Scenario 1: Token Valido**
```
1. User fa richiesta → Backend verifica token → ✅ OK
```

### **Scenario 2: Token Scaduto (con Interceptor)**
```
1. User fa richiesta → Backend ritorna 401
2. Interceptor cattura 401
3. Chiama /refresh con vecchio token
4. Ottiene nuovo token
5. Riprova richiesta originale con nuovo token → ✅ OK
```

### **Scenario 3: Token Scaduto da Troppo Tempo**
```
1. User fa richiesta → Backend ritorna 401
2. Interceptor chiama /refresh
3. Refresh fallisce (token troppo vecchio)
4. Redirect a /login
```

### **Scenario 4: Refresh Automatico (Timer)**
```
1. Ogni 20 ore, chiama /refresh
2. Ottiene nuovo token
3. Aggiorna localStorage
4. User continua senza interruzioni
```

---

## 🎯 Best Practices

### **1. Quando Refreshare:**
- ✅ Ogni 20 ore (4 ore prima scadenza)
- ✅ Quando ricevi 401
- ❌ NON ad ogni richiesta (troppo overhead)

### **2. Dove Salvare Token:**
- ✅ localStorage (web app)
- ✅ SecureStorage (mobile app)
- ❌ Cookie (se non httpOnly)

### **3. Gestione Errori:**
```typescript
try {
  const response = await fetch('/api/v2/auth/refresh', ...);
  
  if (response.ok) {
    // Refresh OK
    const { token } = await response.json();
    localStorage.setItem('token', token);
  } else if (response.status === 401) {
    // Token troppo vecchio, logout
    logout();
  } else {
    // Altro errore, riprova dopo
    setTimeout(refreshToken, 60000); // Riprova dopo 1 min
  }
} catch (error) {
  // Errore rete, riprova dopo
  setTimeout(refreshToken, 60000);
}
```

---

## 📊 Endpoint `/auth/me` - Verifica Sessione

### **Quando Usare:**
- ✅ All'avvio app
- ✅ Dopo refresh pagina
- ✅ Per verificare se user ancora loggato

### **Esempio:**
```typescript
// All'avvio app
useEffect(() => {
  const checkSession = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const response = await fetch('/api/v2/auth/me', {
      headers: {
        'x-api-key': API_KEY,
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      setUser(data.user);
      setProfile(data.profile);
    } else {
      // Token non valido, logout
      router.push('/login');
    }
  };

  checkSession();
}, []);
```

---

## 🔒 Sicurezza

### **Backend Verifica:**
1. ✅ Token JWT valido (firma corretta)
2. ✅ Token non scaduto (per `/me`)
3. ✅ Token anche se scaduto (per `/refresh`, max 7 giorni)
4. ✅ User esiste nel DB
5. ✅ User non disabilitato (`expired: false`)
6. ✅ Token corrisponde a quello salvato nel DB

### **Refresh Accetta Token Scaduto:**
```typescript
// In /refresh endpoint
try {
  decoded = jwt.verify(token, JWT_SECRET);
} catch (error) {
  // Se scaduto, decodifica senza verifica
  if (error.name === 'TokenExpiredError') {
    decoded = jwt.decode(token);
  }
}
```

**Perché?** Per permettere refresh anche con token scaduto (entro limiti ragionevoli).

---

## 📝 Riepilogo Endpoint Auth

| Endpoint | Metodo | Scopo | Token Richiesto |
|----------|--------|-------|-----------------|
| `/auth/login` | POST | Login iniziale | ❌ No |
| `/auth/refresh` | POST | Rinnova token | ✅ Sì (anche scaduto) |
| `/auth/me` | GET | Info utente | ✅ Sì (valido) |
| `/auth/register-business` | POST | Registra business | ❌ No |
| `/auth/register-logistics` | POST | Registra logistics | ❌ No |

---

## 🚀 Setup Completo Frontend

### **1. Crea `lib/api.ts`:**
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v2',
  headers: {
    'x-api-key': process.env.NEXT_PUBLIC_API_KEY!
  }
});

// Auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const newToken = await refreshToken();
      if (newToken) {
        error.config.headers.Authorization = `Bearer ${newToken}`;
        return api(error.config);
      }
    }
    return Promise.reject(error);
  }
);

async function refreshToken() {
  try {
    const oldToken = localStorage.getItem('token');
    const response = await axios.post('/api/v2/auth/refresh', {}, {
      headers: {
        'x-api-key': process.env.NEXT_PUBLIC_API_KEY!,
        'Authorization': `Bearer ${oldToken}`
      }
    });
    const { token } = response.data;
    localStorage.setItem('token', token);
    return token;
  } catch {
    localStorage.clear();
    window.location.href = '/login';
    return null;
  }
}

export default api;
```

### **2. Usa in componenti:**
```typescript
import api from '@/lib/api';

// Tutte le richieste con auto-refresh
const fetchOrders = async () => {
  const response = await api.get('/business/deliveries');
  setOrders(response.data.deliveries);
};
```

---

## ✅ Sistema Completo

**Hai ora:**
- ✅ Login con JWT (24h)
- ✅ Refresh automatico token
- ✅ Verifica sessione
- ✅ Auto-refresh su 401
- ✅ Timer refresh preventivo

**User experience:**
- ✅ Login una volta
- ✅ Token si rinnova automaticamente
- ✅ Nessuna interruzione per 24h+
- ✅ Logout solo se necessario

🎉 **Sistema auth completo e pronto!**
