import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

/**
 * Webhook receiver for SendPulse WhatsApp events.
 * 
 * Strategy: SINGLE Firestore write per webhook.
 * 
 * Writes to `globalTrigger/latest` with:
 * - A monotonically increasing counter (so the UI always detects a change)
 * - The event data (botId, contactId, lastMessage, eventTitle)
 * 
 * The UI listens via onSnapshot on this single document. When it changes,
 * it reads the event data and applies a TARGETED update to only the 
 * affected chat — no full re-fetch from SendPulse API.
 * 
 * Total Firestore writes per webhook: 1 (just globalTrigger)
 */
export async function POST(request: Request) {
  if (!process.env.SERVICE_ACCOUNT_KEY) {
    console.error("SERVICE_ACCOUNT_KEY non configurata.");
    return NextResponse.json({ success: false, error: "Server misconfigured" }, { status: 500 });
  }

  const rawBody = await request.text();

  try {
    const db = getDb();

    // 1. Parse — SendPulse sends an array
    let parsedPayload: any;
    try {
      parsedPayload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ success: true, message: "Unparseable payload, ignored." });
    }

    const events = Array.isArray(parsedPayload) ? parsedPayload : [parsedPayload];
    const ev = events[0];
    if (!ev) {
      return NextResponse.json({ success: true, message: "Empty payload." });
    }

    const eventTitle: string = ev.title || 'unknown';
    const botId: string | null = ev.bot?.id || null;
    const contactId: string | null = ev.contact?.id || null;
    const contactName: string | null = ev.contact?.name || null;
    const contactPhone: string | null = ev.contact?.phone || null;
    const lastMessage: string | null = ev.contact?.last_message || null;

    // 2. Single write: update globalTrigger with event data + atomic counter.
    //    The counter ensures onSnapshot always fires, even if two consecutive
    //    webhooks have the same botId/contactId.
    await db.collection('globalTrigger').doc('latest').set({
      seq: FieldValue.increment(1),
      eventTitle,
      botId,
      contactId,
      contactName,
      contactPhone,
      lastMessage,
      updatedAt: Timestamp.now(),
    }, { merge: true });

    console.log(`✅ [${eventTitle}] bot=${botId} contact=${contactId} (${contactName})`);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("WEBHOOK ERROR:", error.message, rawBody?.substring(0, 500));
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
