
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  // --- DIAGNOSTICA AGGIUNTA ---
  if (!process.env.SERVICE_ACCOUNT_KEY) {
    const errorMsg = "ERRORE CRITICO: La variabile d'ambiente SERVICE_ACCOUNT_KEY non è configurata sul server. Impossibile connettersi al database.";
    console.error(errorMsg);
    // This will appear in the server logs on Firebase Hosting
    return NextResponse.json(
        { success: false, error: errorMsg },
        { status: 500 }
    );
  }
  // --- FINE DIAGNOSTICA ---

  const rawBody = await request.text(); // Legge il corpo una volta sola come testo.

  try {
    const db = getDb();
    const batch = db.batch();

    const logRef = db.collection('webhook_logs').doc();
    
    // Salva il payload come stringa, senza fare il parsing.
    // E logga anche gli header per un debug completo.
    batch.set(logRef, {
      payload: rawBody, 
      createdAt: Timestamp.now(),
      headers: Object.fromEntries(request.headers),
    });

    // Parse payload safely to extract botId
    let parsedPayload;
    try {
        parsedPayload = JSON.parse(rawBody);
    } catch {
        parsedPayload = {};
    }
    const botId = parsedPayload?.bot_id || parsedPayload?.data?.bot_id || null;

    // Aggiorna il trigger per la UI
    const triggerRef = db.collection('realtime_updates').doc('global_trigger');
    batch.set(triggerRef, {
        lastUpdate: Timestamp.now(),
        botId: botId,
    });

    await batch.commit();

    // Rispondi con successo
    return NextResponse.json({ success: true, message: "Webhook ricevuto e salvato correttamente." });

  } catch (error: any) {
    // Se qualcosa va storto (es. problemi di connessione a Firebase), logga tutto.
    console.error("ERRORE CRITICO IMPREVISTO NEL WEBHOOK RECEIVER:", {
        message: error.message,
        stack: error.stack,
        corpoRicevuto: rawBody, // Logga il corpo grezzo che ha causato l'errore
    });
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
