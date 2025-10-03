# 🎨 Diagrammi Sistema - Dashboard e Ruoli

## Flusso Autenticazione e Routing

```mermaid
flowchart TD
    Start([Utente Apre App]) --> Login[Login Page]
    Login --> API[POST /api/v2/auth/login]
    API --> Check{Credenziali<br/>Valide?}
    
    Check -->|No| Error[Errore 401<br/>Credenziali Errate]
    Error --> Login
    
    Check -->|Si| Token[Salva Token + User + Profile<br/>in localStorage]
    Token --> Role{Controlla<br/>user.role}
    
    Role -->|BUSINESS| DashB[Dashboard Business<br/>/dashboard/business]
    Role -->|LOGISTICS| DashL[Dashboard Logistics<br/>/dashboard/logistics]
    Role -->|ADMIN| DashA[Dashboard Admin<br/>/dashboard/admin]
    
    DashB --> Protected1[ProtectedRoute<br/>allowedRoles: BUSINESS]
    DashL --> Protected2[ProtectedRoute<br/>allowedRoles: LOGISTICS]
    DashA --> Protected3[ProtectedRoute<br/>allowedRoles: ADMIN]
```

---

## Gerarchia Ruoli e Permessi

```mermaid
graph TB
    Admin[ADMIN<br/>Accesso Completo] --> Logistics[LOGISTICS<br/>Gestisce Business]
    Admin --> Business[BUSINESS<br/>Gestisce Ordini]
    Admin --> Raider[RAIDER<br/>Consegna Ordini]
    
    Logistics --> Business
    Logistics --> Raider
    Business --> Raider
    
    style Admin fill:#ff6b6b,stroke:#c92a2a,color:#fff
    style Logistics fill:#4dabf7,stroke:#1971c2,color:#fff
    style Business fill:#51cf66,stroke:#2f9e44,color:#fff
    style Raider fill:#ffd43b,stroke:#fab005,color:#000
```

---

## Flusso Creazione Raider

```mermaid
flowchart LR
    subgraph Business Flow
        B1[Business Login] --> B2[POST /business/raiders]
        B2 --> B3[Crea User + Raider]
        B3 --> B4[createdByBusinessId = business.id]
        B4 --> B5[Raider Attivo<br/>per Business]
    end
    
    subgraph Logistics Flow
        L1[Logistics Login] --> L2[POST /logistics/raiders]
        L2 --> L3[Crea User + Raider]
        L3 --> L4[createdByLogisticsId = logistics.id]
        L4 --> L5[POST /logistics/raiders/assign]
        L5 --> L6[Assegna a Business]
    end
    
    subgraph Admin Flow
        A1[Admin Login] --> A2[POST /admin/raiders]
        A2 --> A3[Crea User + Raider]
        A3 --> A4[createdByAdminId = admin.id]
        A4 --> A5[Assegna a Business<br/>opzionale]
    end
    
    style Business Flow fill:#e7f5ff
    style Logistics Flow fill:#f3f0ff
    style Admin Flow fill:#fff5f5
```

---

## Flusso Creazione Ordine

```mermaid
sequenceDiagram
    participant F as Frontend
    participant API as API v2
    participant JWT as JWT Decoder
    participant DB as Database
    
    alt Business Crea Ordine
        F->>API: POST /business/deliveries<br/>{customerName, address, ...}
        API->>JWT: Decodifica Token
        JWT->>API: userId
        API->>DB: Trova Business(userId)
        DB->>API: businessId
        API->>DB: Crea Ordine<br/>businessId automatico
        DB->>API: Ordine Creato
        API->>F: 201 Created
    end
    
    alt Logistics Crea Ordine
        F->>API: POST /logistics/deliveries<br/>{businessId, customerName, ...}
        API->>JWT: Decodifica Token
        JWT->>API: userId
        API->>DB: Trova Logistics(userId)
        DB->>API: logisticsId + business assegnati
        API->>API: Verifica businessId<br/>in business assegnati
        API->>DB: Crea Ordine<br/>per business target
        DB->>API: Ordine Creato
        API->>F: 201 Created
    end
```

---

## Dashboard Business - Componenti

```mermaid
graph TD
    DashB[Dashboard Business] --> Stats[Statistiche<br/>GET /business/stats]
    DashB --> Orders[Ordini<br/>GET /business/deliveries]
    DashB --> Raiders[Raider<br/>GET /business/raiders]
    DashB --> Profile[Profilo<br/>GET /business/profile]
    
    Orders --> CreateOrder[Crea Ordine<br/>POST /business/deliveries]
    Orders --> EditOrder[Modifica<br/>PUT /business/deliveries/:id]
    Orders --> DeleteOrder[Elimina<br/>DELETE /business/deliveries/:id]
    Orders --> Reassign[Riassegna<br/>POST /deliveries/:id/reassign]
    
    Raiders --> Pending[Pending<br/>GET /raiders/pending]
    Raiders --> CreateRaider[Crea Raider<br/>POST /business/raiders]
    Raiders --> EditRaider[Modifica<br/>PUT /raiders/:id]
    Raiders --> Approve[Approva<br/>POST /raiders/approve]
    Raiders --> Remove[Rimuovi<br/>DELETE /raiders/remove]
    
    style DashB fill:#51cf66,stroke:#2f9e44,color:#fff
    style Stats fill:#ffd43b,stroke:#fab005
    style Orders fill:#4dabf7,stroke:#1971c2,color:#fff
    style Raiders fill:#ff6b6b,stroke:#c92a2a,color:#fff
    style Profile fill:#868e96,stroke:#495057,color:#fff
```

---

## Dashboard Logistics - Componenti

```mermaid
graph TD
    DashL[Dashboard Logistics] --> StatsL[Statistiche Globali<br/>GET /logistics/stats/global]
    DashL --> Business[Business Assegnati<br/>GET /logistics/businesses]
    DashL --> OrdersL[Ordini<br/>GET /logistics/deliveries]
    DashL --> RaidersL[Raider<br/>GET /logistics/raiders]
    
    Business --> CreateBiz[Crea Business<br/>POST /logistics/businesses]
    Business --> EditBiz[Modifica<br/>PUT /businesses/:id]
    
    OrdersL --> CreateOrderL[Crea Ordine<br/>POST /logistics/deliveries<br/>per business assegnato]
    OrdersL --> AssignBulk[Assegna Batch<br/>POST /deliveries/assign-bulk]
    
    RaidersL --> CreateRaiderL[Crea Raider<br/>POST /logistics/raiders]
    RaidersL --> AssignRaider[Assegna a Business<br/>POST /raiders/assign]
    RaidersL --> EditRaiderL[Modifica<br/>PUT /raiders/:id]
    
    style DashL fill:#4dabf7,stroke:#1971c2,color:#fff
    style StatsL fill:#ffd43b,stroke:#fab005
    style Business fill:#51cf66,stroke:#2f9e44,color:#fff
    style OrdersL fill:#ff6b6b,stroke:#c92a2a,color:#fff
    style RaidersL fill:#f783ac,stroke:#e64980,color:#fff
```

---

## Dashboard Admin - Componenti

```mermaid
graph TD
    DashA[Dashboard Admin] --> StatsA[Statistiche Sistema<br/>GET /admin/stats]
    DashA --> Users[Utenti<br/>GET /admin/users]
    DashA --> LogisticsA[Logistics<br/>GET /admin/logistics]
    DashA --> BusinessA[Business<br/>GET /admin/businesses]
    DashA --> RaidersA[Raider<br/>GET /admin/raiders]
    DashA --> OrdersA[Ordini Globali<br/>GET /admin/deliveries]
    
    Users --> ChangeRole[Cambia Ruolo<br/>PUT /users/:id/role]
    Users --> ToggleStatus[Attiva/Disattiva<br/>PUT /users/:id/status]
    
    LogisticsA --> AssignBiz[Assegna Business<br/>POST /logistics/assign-businesses]
    LogisticsA --> RemoveBiz[Rimuovi Business<br/>DELETE /logistics/remove-businesses]
    
    BusinessA --> CreateBizA[Crea Business<br/>POST /admin/businesses]
    BusinessA --> EditBizA[Modifica<br/>PUT /businesses/:id]
    BusinessA --> DeleteBizA[Elimina<br/>DELETE /businesses/:id]
    
    RaidersA --> CreateRaiderA[Crea Raider<br/>POST /admin/raiders<br/>per chiunque]
    RaidersA --> EditRaiderA[Modifica<br/>PUT /raiders/:id<br/>anche email]
    RaidersA --> ToggleRaider[Attiva/Disattiva<br/>PUT /raiders/:id/status]
    
    style DashA fill:#ff6b6b,stroke:#c92a2a,color:#fff
    style StatsA fill:#ffd43b,stroke:#fab005
    style Users fill:#868e96,stroke:#495057,color:#fff
    style LogisticsA fill:#4dabf7,stroke:#1971c2,color:#fff
    style BusinessA fill:#51cf66,stroke:#2f9e44,color:#fff
    style RaidersA fill:#f783ac,stroke:#e64980,color:#fff
    style OrdersA fill:#ff922b,stroke:#fd7e14,color:#fff
```

---

## Controllo Permessi

```mermaid
flowchart TD
    Request[Richiesta API] --> Header{Header<br/>Authorization?}
    
    Header -->|No| Err401[ERROR 401 Unauthorized]
    Header -->|Si| Decode[Decodifica JWT]
    
    Decode --> Valid{Token<br/>Valido?}
    Valid -->|No| Err401
    Valid -->|Si| Extract[Estrae userId + role]
    
    Extract --> CheckRole{Controlla<br/>Ruolo}
    
    CheckRole -->|BUSINESS| LoadBiz[Carica Business Profile<br/>auth.business.id]
    CheckRole -->|LOGISTICS| LoadLog[Carica Logistics Profile<br/>auth.logistics.id]
    CheckRole -->|ADMIN| LoadAdm[Carica Admin<br/>auth.user.id]
    
    LoadBiz --> PermBiz{Permesso<br/>Business?}
    LoadLog --> PermLog{Permesso<br/>Logistics?}
    LoadAdm --> PermAdm{Permesso<br/>Admin?}
    
    PermBiz -->|No| Err403[ERROR 403 Forbidden]
    PermLog -->|No| Err403
    PermAdm -->|No| Err403
    
    PermBiz -->|Si| Success[OK Esegui Operazione]
    PermLog -->|Si| Success
    PermAdm -->|Si| Success
    
    Success --> Response[200/201 Response]
```

---

## Flusso Completo: Business Approva Raider

```mermaid
sequenceDiagram
    participant R as Raider App Mobile
    participant API as API v1/v2
    participant DB as Database
    participant B as Business Dashboard
    
    Note over R,B: 1. Raider Richiede Abilitazione
    R->>API: POST /v1/reltest/assignRaiderToBusiness<br/>{raiderId, businessIds: [businessId]}
    API->>DB: Crea BusinessRaider<br/>confirmedFromBusiness: false
    DB->>API: Relazione Creata
    API->>R: 200 OK
    
    Note over R,B: 2. Business Vede Richiesta Pending
    B->>API: GET /v2/business/raiders/pending<br/>Authorization: Bearer TOKEN
    API->>DB: Trova relazioni<br/>confirmedFromBusiness: false
    DB->>API: Lista Pending
    API->>B: 200 OK + Pending Raiders
    
    Note over R,B: 3. Business Approva Raider
    B->>API: POST /v2/business/raiders/approve<br/>{raiderId}<br/>Authorization: Bearer TOKEN
    API->>DB: Aggiorna BusinessRaider<br/>confirmedFromBusiness: true
    API->>DB: Aggiorna array raiderActived[]
    DB->>API: Aggiornato
    API->>B: 200 OK
    
    Note over R,B: 4. Raider Ora Attivo
    R->>API: GET /v1/raider/deliveries
    API->>DB: Trova ordini business
    DB->>API: Lista Ordini
    API->>R: 200 OK + Ordini Disponibili
```

---

## Relazioni Database

```mermaid
erDiagram
    USER ||--o| BUSINESS : "ha profilo"
    USER ||--o| LOGISTICS : "ha profilo"
    USER ||--o| RAIDER : "ha profilo"
    
    BUSINESS ||--o{ DELIVERY : "crea"
    BUSINESS ||--o{ BUSINESS_RAIDER : "ha relazione"
    
    LOGISTICS ||--o{ LOGISTICS_BUSINESS : "gestisce"
    LOGISTICS_BUSINESS }o--|| BUSINESS : "assegnato a"
    
    RAIDER ||--o{ BUSINESS_RAIDER : "assegnato a"
    RAIDER ||--o{ DELIVERY : "consegna"
    
    BUSINESS_RAIDER {
        string businessId
        string raiderId
        boolean confirmedFromBusiness
    }
    
    RAIDER {
        string createdByBusinessId
        string createdByLogisticsId
        string createdByAdminId
    }
```

---

## Use Case: Logistics Crea e Assegna Raider

```mermaid
flowchart TD
    Start([Logistics Login]) --> Dash[Dashboard Logistics]
    Dash --> Create[Click: Crea Raider]
    
    Create --> Form[Form Raider<br/>email, password, name, etc.]
    Form --> Submit1[POST /logistics/raiders]
    
    Submit1 --> API1[API Crea Raider<br/>createdByLogisticsId = logistics.id]
    API1 --> Success1[OK - Raider Creato]
    
    Success1 --> Assign[Click: Assegna a Business]
    Assign --> Select[Seleziona Business<br/>tra quelli assegnati]
    
    Select --> Submit2[POST /logistics/raiders/assign<br/>raiderId + businessIds]
    Submit2 --> API2[API Verifica Permessi]
    
    API2 --> Check{Business<br/>Assegnato?}
    Check -->|No| Error[ERROR - 403 Forbidden]
    Check -->|Si| Create2[Crea BusinessRaider<br/>Aggiorna array]
    
    Create2 --> Success2[OK - Raider Assegnato]
    Success2 --> Notify[Business Vede Raider<br/>in Dashboard]
```

---

## Riepilogo Architettura

```mermaid
graph TB
    subgraph Frontend
        Login[Login Page]
        DashB[Business Dashboard]
        DashL[Logistics Dashboard]
        DashA[Admin Dashboard]
    end
    
    subgraph API Layer
        Auth[Auth Endpoints]
        BizAPI[Business Endpoints]
        LogAPI[Logistics Endpoints]
        AdmAPI[Admin Endpoints]
    end
    
    subgraph Auth Layer
        JWT[JWT Decoder]
        Perm[Permission Checker]
    end
    
    subgraph Database
        Users[(Users)]
        Profiles[(Business/Logistics/Raider)]
        Orders[(Deliveries)]
        Relations[(Relations)]
    end
    
    Login --> Auth
    DashB --> BizAPI
    DashL --> LogAPI
    DashA --> AdmAPI
    
    Auth --> JWT
    BizAPI --> JWT
    LogAPI --> JWT
    AdmAPI --> JWT
    
    JWT --> Perm
    Perm --> Users
    Perm --> Profiles
    
    BizAPI --> Orders
    LogAPI --> Orders
    AdmAPI --> Orders
    
    BizAPI --> Relations
    LogAPI --> Relations
    AdmAPI --> Relations
    
    style Frontend fill:#e7f5ff
    style API Layer fill:#f3f0ff
    style Auth Layer fill:#fff5f5
    style Database fill:#f8f9fa
```

---

**Versione:** 2.0  
**Data:** 2025-10-02  
**Diagrammi:** Mermaid (compatibili con GitHub, GitLab, Notion)
