
import { NextResponse, type NextRequest } from 'next/server';
import admin, { adminDb } from '@/lib/firebaseAdmin';
import { createHash } from 'crypto';
import { env } from '@/lib/env';

const PAYTECH_API_KEY = env.PAYTECH_API_KEY;
const PAYTECH_API_SECRET = env.PAYTECH_API_SECRET;

export async function POST(request: NextRequest) {
    // --- Configuration Checks ---
    if (!PAYTECH_API_KEY || !PAYTECH_API_SECRET) {
        console.error("CRITICAL PAYTECH IPN ERROR: PayTech API Key or Secret is not defined in environment variables.");
        return NextResponse.json({ error: "Configuration du serveur de paiement IPN manquante." }, { status: 500 });
    }
    if (!admin || !adminDb) {
        console.error("CRITICAL FIREBASE ADMIN IPN ERROR: Firebase Admin SDK is not initialized.");
        return NextResponse.json({ error: "Configuration du serveur de base de données IPN manquante." }, { status: 500 });
    }

    try {
        const body = await request.json();

        // --- Security Check ---
        const apiKeyHash = createHash('sha256').update(PAYTECH_API_KEY).digest('hex');
        const apiSecretHash = createHash('sha256').update(PAYTECH_API_SECRET).digest('hex');

        if (body.api_key_sha256 !== apiKeyHash || body.api_secret_sha256 !== apiSecretHash) {
            console.warn("PayTech IPN validation failed: API key/secret hashes do not match.", { 
                receivedKeyHash: body.api_key_sha256, 
                expectedKeyHash: apiKeyHash,
                receivedSecretHash: body.api_secret_sha256,
            });
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }
        
        const { type_event, ref_command } = body;

        if (!ref_command || !type_event) {
            return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
        }

        const paymentIntentRef = adminDb.collection('paymentIntents').doc(ref_command);
        const paymentIntentSnap = await paymentIntentRef.get();

        if (!paymentIntentSnap.exists) {
            console.error(`PayTech IPN Error: Payment intent with ref_command ${ref_command} not found.`);
            return NextResponse.json({ error: "Intent de paiement non trouvé" }, { status: 404 });
        }
        
        const paymentIntent = paymentIntentSnap.data()!;
        
        if (paymentIntent.status === 'success') {
            console.log(`PayTech IPN Info: Transaction ${ref_command} already processed successfully.`);
            return NextResponse.json({ message: "Transaction déjà traitée" });
        }

        if (type_event === 'sale_success') {
            const userId = paymentIntent.userId;
            const creditAmount = paymentIntent.creditAmount;

            if (!userId || !creditAmount) {
                 console.error(`PayTech IPN Error: Missing userId or creditAmount in payment intent ${ref_command}.`);
                 return NextResponse.json({ error: "Données de transaction invalides." }, { status: 400 });
            }

            const userRef = adminDb.collection('users').doc(userId);

            await adminDb.runTransaction(async (transaction) => {
                const userSnap = await transaction.get(userRef);
                if (!userSnap.exists) {
                    throw new Error(`Utilisateur ${userId} non trouvé dans la transaction.`);
                }
                
                transaction.update(userRef, {
                    credits: admin.firestore.FieldValue.increment(creditAmount)
                });

                transaction.update(paymentIntentRef, {
                    status: 'success',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    ipnPayload: body // Store the successful payload for reference
                });
            });

            console.log(`Successfully credited ${creditAmount} credits to user ${userId} for command ${ref_command}`);
            
        } else {
            await paymentIntentRef.update({
                status: 'failed',
                error: `Événement reçu: ${type_event}`,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                ipnPayload: body // Store the failed payload for reference
            });
            console.log(`Payment failed or was canceled for command ${ref_command}. Event: ${type_event}`);
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Error in PayTech IPN handler:", error);
        return NextResponse.json({ error: "Erreur interne du serveur lors du traitement IPN." }, { status: 500 });
    }
}
