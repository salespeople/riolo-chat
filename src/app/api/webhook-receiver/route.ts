
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Webhook receiver for SendPulse WhatsApp events.
 *
 * Instead of just writing a global trigger that forces a full refresh,
 * this handler writes a granular event document to `realtimeEvents/{auto-id}`.
 * The UI listens on this collection and applies targeted updates to the
 * affected chat only — no full re-fetch needed.
 *
 * Events are auto-cleaned after being processed (TTL via scheduled function
 * or client-side cleanup).
 */
export async function POST(request: Request) {
  if (!process.env.SERVICE_ACCOUNT_KEY) {
    const errorMsg = "ERRORE CRITICO: SERVICE_ACCOUNT_KEY non configurata.";
    console.error(errorMsg);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }

  const rawBody = await request.text();

  try {
    const db = getDb();
    const batch = db.batch();

    // 1. Parse — SendPulse sends an array
    let parsedPayload: any;
    try {
      parsedPayload = JSON.parse(rawBody);
    } catch {
      parsedPayload = null;
    }

    const events = Array.isArray(parsedPayload) ? parsedPayload : (parsedPayload ? [parsedPayload] : []);
    const firstEvent = events[0];

    if (!firstEvent) {
      return NextResponse.json({ success: true, message: "Empty payload, ignored." });
    }

    const eventTitle = firstEvent.title || 'unknown';
    const botId = firstEvent.bot?.id || null;
    const contactId = firstEvent.contact?.id || null;
    const contactName = firstEvent.contact?.name || null;
    const contactPhone = firstEvent.contact?.phone || null;
    const lastMessage = firstEvent.contact?.last_message || null;
    const service = firstEvent.service || 'unknown';
    const eventDate = firstEvent.date || null;

    // 2. Log to webhook_logs (for debug)
    const logRef = db.collection('webhook_logs').doc();
    batch.set(logRef, {
      payload: rawBody,
      eventTitle,
      botId,
      contactId,
      contactName,
      service,
      createdAt: Timestamp.now(),
    });

    // 3. Write a granular event to realtimeEvents collection.
    //    The UI listens on this collection and applies targeted updates.
    const eventRef = db.collection('realtimeEvents').doc();
    batch.set(eventRef, {
      eventTitle,
      botId,
      contactId,
      contactName,
      contactPhone,
      lastMessage,
      service,
      eventDate,
      createdAt: Timestamp.now(),
      processed: false, // The UI sets this to true after processing
    });

    await batch.commit();

    console.log(`✅ Webhook: [${service}] ${eventTitle} | bot=${botId} | contact=${contactId} (${contactName})`);

    // Background cleanup: delete events older than 2 minutes (non-blocking)
    cleanupStaleEvents(db).catch(() => { });

    return NextResponse.json({ success: true, message: "Webhook ricevuto e processato." });

  } catch (error: any) {
    console.error("ERRORE CRITICO NEL WEBHOOK RECEIVER:", {
      message: error.message,
      stack: error.stack,
      corpoRicevuto: rawBody,
    });
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/** Deletes realtimeEvents older than 2 minutes to prevent accumulation. */
async function cleanupStaleEvents(db: FirebaseFirestore.Firestore) {
  const twoMinutesAgo = Timestamp.fromMillis(Date.now() - 2 * 60 * 1000);
  const stale = await db
    .collection('realtimeEvents')
    .where('createdAt', '<', twoMinutesAgo)
    .limit(50)
    .get();

  if (stale.empty) return;

  const batch = db.batch();
  stale.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
  console.log(`🧹 Cleaned ${stale.size} stale events.`);
}
