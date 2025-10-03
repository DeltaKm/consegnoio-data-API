// lib/auth.ts
import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import prisma from "@/app/lib/prisma";

const JWT_SECRET: string = process.env.JWT_SECRET!;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET non definito nelle variabili d'ambiente");
}

// ============================================================
// FUNZIONE ORIGINALE - NON MODIFICARE (usata da app raider v1)
// ============================================================
export async function authenticateToken(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return null;

  const token = authHeader.split(" ")[1];
  if (!token) return null;

  let decoded: any;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error("Token non valido:", error);
    return null;
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
  if (!user) return null;
  if (user.tokenJWT !== token || user.expired) return null;
  if (user.expirationJWT && new Date() > user.expirationJWT) return null;

  return decoded;
}

// ============================================================
// NUOVE FUNZIONI PER v2 - Con controllo ruoli
// ============================================================

/**
 * Autentica e ritorna user completo con ruolo
 * Usare per endpoint v2 che necessitano info sul ruolo
 */
export async function authenticateWithRole(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return null;

  const token = authHeader.split(" ")[1];
  if (!token) return null;

  let decoded: any;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error("Token non valido:", error);
    return null;
  }

  const user = await prisma.user.findUnique({ 
    where: { id: decoded.userId },
    include: {
      raiderProfiles: true,
      businessProfiles: true,
      logisticsProfiles: true,
    }
  });
  
  if (!user) return null;
  if (user.tokenJWT !== token || user.expired) return null;
  if (user.expirationJWT && new Date() > user.expirationJWT) return null;

  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    user: user,
  };
}

/**
 * Verifica che l'utente abbia uno dei ruoli permessi
 * Ritorna user se autorizzato, null altrimenti
 */
export async function requireRole(request: NextRequest, allowedRoles: string[]) {
  const auth = await authenticateWithRole(request);
  if (!auth) return null;
  
  if (!auth.role || !allowedRoles.includes(auth.role)) {
    return null;
  }
  
  return auth;
}

/**
 * Ottiene il profilo Business associato all'utente
 */
export async function getBusinessFromUser(userId: string) {
  const business = await prisma.business.findFirst({
    where: { userId },
    include: {
      user: true,
      raiderRelations: {
        include: {
          raider: {
            include: {
              user: true,
            }
          }
        }
      }
    }
  });
  
  return business;
}

/**
 * Ottiene il profilo Raider associato all'utente
 */
export async function getRaiderFromUser(userId: string) {
  const raider = await prisma.raider.findFirst({
    where: { userId },
    include: {
      user: true,
      businessRelations: {
        include: {
          business: true,
        }
      }
    }
  });
  
  return raider;
}

/**
 * Verifica che l'utente sia un Business e ritorna il profilo
 */
export async function requireBusiness(request: NextRequest) {
  const auth = await requireRole(request, ["BUSINESS"]);
  if (!auth) return null;
  
  const business = await getBusinessFromUser(auth.userId);
  if (!business) return null;
  
  return {
    ...auth,
    business,
  };
}

/**
 * Verifica che l'utente sia un Raider e ritorna il profilo
 */
export async function requireRaider(request: NextRequest) {
  const auth = await requireRole(request, ["RAIDER"]);
  if (!auth) return null;
  
  const raider = await getRaiderFromUser(auth.userId);
  if (!raider) return null;
  
  return {
    ...auth,
    raider,
  };
}

/**
 * Ottiene il profilo Logistics associato all'utente
 */
export async function getLogisticsFromUser(userId: string) {
  const logistics = await prisma.logistics.findFirst({
    where: { userId },
    include: {
      user: true,
      businessRelations: {
        include: {
          business: {
            include: {
              user: true,
            }
          }
        }
      }
    }
  });
  
  return logistics;
}

/**
 * Verifica che l'utente sia Logistics e ritorna il profilo
 */
export async function requireLogistics(request: NextRequest) {
  const auth = await requireRole(request, ["LOGISTICS"]);
  if (!auth) return null;
  
  const logistics = await getLogisticsFromUser(auth.userId);
  if (!logistics) return null;
  
  return {
    ...auth,
    logistics,
  };
}

/**
 * Verifica che l'utente sia Admin
 */
export async function requireAdmin(request: NextRequest) {
  return await requireRole(request, ["ADMIN"]);
}
