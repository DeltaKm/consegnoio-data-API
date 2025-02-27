// lib/auth.ts
import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import prisma from "@/app/lib/prisma";

const JWT_SECRET: string = process.env.JWT_SECRET!;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET non definito nelle variabili d'ambiente");
}

/**
 * Verifica il token JWT, decodifica e controlla anche che
 * il token salvato nel database corrisponda e non sia scaduto/invalido.
 */
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

  // Recupera l'utente dal DB e verifica il token memorizzato
  const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
  if (!user) return null;
  if (user.tokenJWT !== token || user.expired) return null;
  if (user.expirationJWT && new Date() > user.expirationJWT) return null;

  return decoded;
}
