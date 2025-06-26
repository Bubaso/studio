
import { NextResponse, type NextRequest } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import axios from 'axios';
import { randomBytes } from 'crypto';
import { serverTimestamp } from 'firebase-admin/firestore';

const PAYTECH_API_KEY = process.env.PAYTECH_API_KEY;
const PAYTECH_API_SECRET = process.env.PAYTECH_API_SECRET;
const PAYTECH_BASE_URL = 'https://paytech.sn';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(request: NextRequest) {
    // --- Configuration Checks ---
    if (!PAYTECH_API_KEY || !PAYTECH_API_SECRET) {
        console.error("CRITICAL PAYTECH ERROR: PayTech API Key or Secret is not defined in environment variables.");
        return NextResponse.json({ error: "Configuration du serveur de paiement manquante. L'administrateur a été notifié." }, { status: 500 });
    }
    if (!adminAuth || !adminDb) {
        console.error("CRITICAL FIREBASE ADMIN ERROR: Firebase Admin SDK is not initialized. Check server logs.");
        return NextResponse.json({ error: "Configuration du serveur de base de données manquante. L'administrateur a été notifié." }, { status: 500 });
    }

    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }
        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const body = await request.json();
        const { price, creditAmount, packageName } = body;

        if (!price || !creditAmount || !packageName) {
            return NextResponse.json({ error: "Les détails du paquet de crédits sont manquants." }, { status: 400 });
        }

        const ref_command = `REF-${userId.substring(0,5)}-${randomBytes(8).toString('hex')}`;
        
        const paymentIntentRef = adminDb.collection('paymentIntents').doc(ref_command);
        await paymentIntentRef.set({
            userId: userId,
            price: price,
            creditAmount: creditAmount,
            status: 'pending',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        const paytechRequestData = new URLSearchParams();
        paytechRequestData.append('item_price', price.toString());
        paytechRequestData.append('command_name', packageName);
        paytechRequestData.append('ref_command', ref_command);
        paytechRequestData.append('env', 'prod');
        paytechRequestData.append('ipn_url', `${APP_URL}/api/paytech/ipn`);
        paytechRequestData.append('success_url', `${APP_URL}/credits/success?ref=${ref_command}`);
        paytechRequestData.append('cancel_url', `${APP_URL}/credits/cancel?ref=${ref_command}`);

        const response = await axios.post(
            `${PAYTECH_BASE_URL}/api/payment/request-payment`,
            paytechRequestData,
            {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'API_KEY': PAYTECH_API_KEY,
                    'API_SECRET': PAYTECH_API_SECRET,
                },
            }
        );

        if (response.data.success === 1 && response.data.redirect_url) {
            await paymentIntentRef.update({ paytechToken: response.data.token });
            return NextResponse.json({ redirect_url: response.data.redirect_url });
        } else {
            const errorMessage = response.data.errors?.[0] || "Erreur inconnue de PayTech.";
            await paymentIntentRef.update({ status: 'failed', error: errorMessage });
            return NextResponse.json({ error: errorMessage }, { status: 500 });
        }

    } catch (error: any) {
        console.error('Error in request-payment endpoint:', error);

        let errorMessage = "Erreur interne du serveur lors de la demande de paiement.";
        // Check for axios-specific error structure
        if (error.response) {
            console.error('Axios Error Response Data:', error.response.data);
            console.error('Axios Error Response Status:', error.response.status);
            errorMessage = `Erreur de communication avec le service de paiement (Status: ${error.response.status}). Détails: ${JSON.stringify(error.response.data)}`;
        } else if (error.request) {
            console.error('Axios Error: No response received. Request:', error.request);
            errorMessage = "Aucune réponse reçue du service de paiement. Vérifiez la connectivité.";
        } else {
            console.error('Generic Error Message:', error.message);
            errorMessage = error.message;
        }

        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
