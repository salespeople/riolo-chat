
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const db = getDb();

    // The single responsibility: update the global trigger document
    const triggerRef = db.collection('realtime_updates').doc('global_trigger');
    await triggerRef.set({ lastUpdate: Timestamp.now() });

    console.log("✅ Chat list refresh triggered successfully via API.");

    // Return the standard success response
    return NextResponse.json({
      status: "ok",
      message: "Chat list aggiornata correttamente"
    });

  } catch (error: any) {
    console.error("❌ CRITICAL ERROR IN /api/refresh-chats:", {
        message: error.message,
        stack: error.stack,
    });
    
    // Return a server error response
    return NextResponse.json(
        { status: "error", message: "Internal Server Error" },
        { status: 500 }
    );
  }
}
