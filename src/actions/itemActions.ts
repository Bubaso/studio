
'use server';

// NOTE: The logic previously in this file has been moved to the
// `SellerActionsClient.tsx` component. This is because Server Actions
// using the Firebase Client SDK run in an unauthenticated server context,
// which conflicts with Firestore security rules that require user authentication.
//
// By moving the logic to a client component, we can ensure that Firestore
// operations are performed with the user's actual authentication credentials,
// allowing the security rules (`request.auth.uid == ...`) to pass correctly.
// The client component uses `router.refresh()` to achieve a similar result
// to the `revalidatePath()` that was used here.

export {};
