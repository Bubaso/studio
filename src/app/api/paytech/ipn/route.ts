
import { NextResponse, type NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

const PAYTECH_API_KEY = process.env.PAYTECH_API_KEY;
const PAYTECH_API_SECRET = process.env.PAYTECH_API_SECRET;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // --- Security Check ---
        // Based on PayTech docs, validate by checking the keys sent in the IPN body
        if (body.api_key_sha256 !== PAYTECH_API_KEY || body.api_secret_sha256 !== PAYTECH_API_SECRET) {
            console.warn("PayTech IPN validation failed: API keys do not match.", { receivedKey: body.api_key_sha256 });
            // Although the docs imply this validation, returning 401 might cause PayTech to retry.
            // A silent failure or logging might be better depending on their retry policy.
            // For now, we deny the request.
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }
        
        const { type_event, ref_command, payment_token } = body;

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
        
        // Avoid reprocessing a completed transaction
        if (paymentIntent.status === 'success') {
            return NextResponse.json({ message: "Transaction déjà traitée" });
        }

        if (type_event === 'sale_success') {
            const userId = paymentIntent.userId;
            const creditAmount = paymentIntent.creditAmount;
            const userRef = adminDb.collection('users').doc(userId);

            // Use a transaction to ensure atomicity
            await adminDb.runTransaction(async (transaction) => {
                const userSnap = await transaction.get(userRef);
                if (!userSnap.exists) {
                    throw new Error(`Utilisateur ${userId} non trouvé dans la transaction.`);
                }
                
                transaction.update(userRef, {
                    credits: FieldValue.increment(creditAmount)
                });

                transaction.update(paymentIntentRef, {
                    status: 'success',
                    updatedAt: FieldValue.serverTimestamp(),
                });
            });

            console.log(`Successfully credited ${creditAmount} credits to user ${userId} for command ${ref_command}`);
            
        } else { // Handle 'sale_canceled' or other events
            await paymentIntentRef.update({
                status: 'failed',
                error: `Événement reçu: ${type_event}`,
                updatedAt: FieldValue.serverTimestamp(),
            });
            console.log(`Payment failed or was canceled for command ${ref_command}. Event: ${type_event}`);
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Error in PayTech IPN handler:", error);
        return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
    }
}
