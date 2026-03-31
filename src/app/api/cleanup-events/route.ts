
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Cleanup stale realtimeEvents documents older than 5 minutes.
 * 
 * This is a safety net: normally the UI deletes events after processing them,
 * but if no client is connected, events accumulate. This endpoint can be
 * called periodically (e.g. via Cloud Scheduler) or manually.
 */
export async function POST() {
  try {
    const db = getDb();
    const fiveMinutesAgo = Timestamp.fromMillis(Date.now() - 5 * 60 * 1000);

    const staleEvents = await db
      .collection('realtimeEvents')
      .where('createdAt', '<', fiveMinutesAgo)
      .limit(100)
      .get();

    if (staleEvents.empty) {
      return NextResponse.json({ success: true, deleted: 0 });
    }

    const batch = db.batch();
    staleEvents.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    console.log(`🧹 Cleaned up ${staleEvents.size} stale realtime events.`);

    return NextResponse.json({ success: true, deleted: staleEvents.size });
  } catch (error: any) {
    console.error("Error cleaning up events:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
