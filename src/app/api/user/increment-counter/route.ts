
import { NextResponse, type NextRequest } from 'next/server';
import { getAdminInstances, incrementUserCounter } from '@/lib/firebaseAdmin';

export async function POST(request: NextRequest) {
  let adminAuth;
  try {
      ({ auth: adminAuth } = getAdminInstances());
  } catch (error: any) {
      console.error("API INCREMENT_COUNTER - FAILED TO INIT ADMIN:", error.message);
      return NextResponse.json({ error: "Configuration du serveur Firebase Admin manquante." }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const idToken = authHeader.split('Bearer ')[1];
  let decodedToken;
  try {
    decodedToken = await adminAuth.verifyIdToken(idToken);
  } catch (error) {
    console.error('API INCREMENT_COUNTER: Invalid ID token', error);
    return NextResponse.json({ error: 'Session invalide ou expirée.' }, { status: 403 });
  }

  // The UID from the token can be used here if needed for validation,
  // but for now, we just proceed as the action is authorized.
  
  try {
    const { userCount, isFoundingMember } = await incrementUserCounter();
    // The response can be used for further logic if needed, but for now we just confirm success.
    return NextResponse.json({ success: true, userCount, isFoundingMember });
  } catch (error: any) {
    console.error(`API INCREMENT_COUNTER: Error during counter increment:`, error);
    return NextResponse.json({ error: error.message || "Une erreur interne s'est produite lors de la mise à jour du compteur." }, { status: 500 });
  }
}
