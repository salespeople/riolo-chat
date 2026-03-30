
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase-admin';
import { headers } from 'next/headers';

// Funzione per gestire le richieste OPTIONS per il preflight CORS
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(request: Request) {
  console.log("--- NUOVA RICHIESTA A /api/prescriptions ---");

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-control-allow-headers': 'Content-Type, Authorization',
  };

  const headersList = headers();
  const requestHeaders: Record<string, string> = {};
  headersList.forEach((value, key) => {
    requestHeaders[key] = value;
  });

  console.log("HEADERS RICEVUTI:", JSON.stringify(requestHeaders, null, 2));

  // --- API Key Authentication via Bearer Token ---
  const authHeader = headersList.get('Authorization');
  const expectedApiKey = process.env.PRESCRIPTIONS_API_KEY;

  if (!expectedApiKey) {
    console.error('API Key for prescriptions is not configured on the server.');
    return NextResponse.json({ success: false, error: 'Server configuration error.' }, { status: 500, headers: corsHeaders });
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, error: 'Authorization header is missing or malformed.' }, { status: 401, headers: corsHeaders });
  }

  const providedApiKey = authHeader.split(' ')[1];

  if (providedApiKey !== expectedApiKey) {
    return NextResponse.json({ success: false, error: 'Invalid API Key.' }, { status: 403, headers: corsHeaders });
  }
  // --- End API Key Authentication ---

  let prescriptionData;
  try {
    const rawBody = await request.clone().text();
    console.log("CORPO DELLA RICHIESTA (RAW):", rawBody);

    if (!rawBody) {
      return NextResponse.json(
        { success: false, error: 'Bad Request: Empty JSON body.' },
        { status: 400, headers: corsHeaders }
      );
    }

    prescriptionData = JSON.parse(rawBody);

  } catch (error) {
    console.error('Error parsing JSON body:', error);
    return NextResponse.json(
      { success: false, error: 'Bad Request: Invalid or empty JSON format.' },
      { status: 400, headers: corsHeaders }
    );
  }

  console.log("DATI JSON PARSATI:", JSON.stringify(prescriptionData, null, 2));

  // --- START: Validation and data sanitization ---
  if (!prescriptionData.contactID) {
    return NextResponse.json({ success: false, error: 'Bad Request: contactID is a required field.' }, { status: 400, headers: corsHeaders });
  }

  // Get instanceId ID from environment variables
  const appInstanceId = process.env.NEXT_PUBLIC_APP_INSTANCE_ID;
  if (!appInstanceId) {
    console.error('NEXT_PUBLIC_APP_INSTANCE_ID is not configured on the server.');
    return NextResponse.json({ success: false, error: 'Server configuration error: Missing instance ID.' }, { status: 500, headers: corsHeaders });
  }

  const { ...dataToSave } = prescriptionData;

  // --- END: Validation and data sanitization ---


  try {
    const db = getDb();

    console.log("DATI IN SALVATAGGIO SU FIRESTORE:", JSON.stringify(dataToSave, null, 2));

    // Use the root 'prescriptions' collection
    const docRef = await db.collection('prescriptions').add({
      ...dataToSave,
      instanceId: appInstanceId, // Add the instanceId ID
      createdAt: new Date(),
    });

    console.log(`✅ Prescrizione creata con successo con ID: ${docRef.id}`);

    return NextResponse.json({
      success: true,
      message: 'Prescription created successfully.',
      id: docRef.id,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error creating prescription in Firestore:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json(
      { success: false, error: `Internal Server Error: ${errorMessage}` },
      { status: 500, headers: corsHeaders }
    );
  }
}
