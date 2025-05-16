// app/lib/fcm.ts
import admin from 'firebase-admin';
import prisma from '@/app/lib/prisma';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    }),
  });
}

export interface NotificationResult {
  token: string;
  success: boolean;
  messageId?: string;
  errorCode?: string;
}

export async function sendNotification(
  raiderId: string,
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{
  successCount: number;
  failureCount: number;
  results: NotificationResult[];
}> {
  let successCount = 0;
  let failureCount = 0;
  const results: NotificationResult[] = [];

  let validTokens = [...tokens];

  for (const token of tokens) {
    try {
      // Assicuriamoci che i dati non contengano indirizzi
      const cleanData = { ...data };
      // Rimuoviamo esplicitamente gli indirizzi dai dati
      delete cleanData.pickupAddress;
      delete cleanData.deliveryAddress;
      
      // Convertiamo tutti i valori in stringhe come richiesto da Firebase
      const formattedData: Record<string, string> = {};
      for (const key in cleanData) {
        formattedData[key] = String(cleanData[key] || '');
      }
      
      const messageId = await admin
        .messaging()
        .send({ token, notification: { title, body }, data: formattedData });
      successCount++;
      results.push({ token, success: true, messageId });
    } catch (err: any) {
      failureCount++;
      const code = err.code as string;
      results.push({ token, success: false, errorCode: code });

      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token'
      ) {
        validTokens = validTokens.filter(t => t !== token);
      }
    }
  }

  if (validTokens.length !== tokens.length) {
    await prisma.raider.update({
      where: { id: raiderId },
      data: {
        deviceTokens: {
          set: validTokens,
        },
      },
    });
  }

  return { successCount, failureCount, results };
}
