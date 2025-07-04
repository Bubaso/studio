
'use server';

/**
 * @fileOverview A service for sending emails.
 * In a real application, this would integrate with an email provider like SendGrid, Mailgun, or AWS SES.
 * For this example, it simulates sending an email by logging the content to the console.
 */

interface WelcomeEmailParams {
  to: string;
  name: string;
}

/**
 * "Sends" a welcome email to a new user.
 * @param {WelcomeEmailParams} params - The email parameters.
 * @returns {Promise<{success: boolean}>} A promise that resolves when the email is "sent".
 */
export async function sendWelcomeEmail({ to, name }: WelcomeEmailParams): Promise<{ success: boolean }> {
  const subject = "Bienvenue sur JëndJaay ! Votre aventure commence maintenant.";

  const body = `
Bonjour ${name},

Nous sommes ravis de vous accueillir sur JëndJaay, votre nouvelle place de marché pour acheter et vendre des articles d'occasion uniques !

Pour vous aider à démarrer, voici ce que vous pouvez faire dès maintenant :

*   **Vendre facilement :** Vous avez une pépite à vendre ? Postez votre première annonce en quelques clics. Vous disposez de **5 annonces gratuites** pour commencer !
*   **Découvrir des trésors :** Parcourez des milliers d'articles et trouvez la perle rare près de chez vous.
*   **Créer vos collections :** Sauvegardez vos articles préférés dans des collections personnalisées pour les retrouver plus tard.

Nous sommes une communauté construite sur la confiance. N'hésitez pas à échanger avec les autres membres et à construire votre réputation.

À très bientôt sur JëndJaay !

L'équipe JëndJaay
`;

  console.log('--- SIMULATING EMAIL SEND ---');
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log('Body:');
  console.log(body);
  console.log('-----------------------------');
  
  // In a real implementation, you would use an email SDK here.
  // For example, using a fictional `emailProvider.send()`:
  //
  // try {
  //   await emailProvider.send({
  //     to: to,
  //     from: 'welcome@jendjaay.app',
  //     subject: subject,
  //     html: `<p>... a formatted HTML version of the body ...</p>`,
  //     text: body
  //   });
  //   return { success: true };
  // } catch (error) {
  //   console.error("Failed to send welcome email:", error);
  //   return { success: false };
  // }

  // Since this is a simulation, we'll always return success.
  return Promise.resolve({ success: true });
}
