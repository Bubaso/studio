
'use server';

import { getTranslations } from 'next-intl/server';

/**
 * @fileOverview A service for sending emails.
 * In a real application, this would integrate with an email provider like SendGrid, Mailgun, or AWS SES.
 * For this example, it simulates sending an email by logging the content to the console.
 */

interface WelcomeEmailParams {
  to: string;
  name: string;
  locale: string;
}

/**
 * Generates the content for a welcome email in the user's chosen language.
 * @param {WelcomeEmailParams} params - The email parameters.
 * @returns {Promise<{ subject: string; body: string; }>} A promise that resolves with the email's subject and body.
 */
export async function sendWelcomeEmail({ to, name, locale }: WelcomeEmailParams): Promise<{ subject: string; body: string; }> {
  try {
    const t = await getTranslations({ locale, namespace: 'WelcomeEmail'});

    const subject = t('subject');
    const body = t('body', { name });

    // In a real implementation, you would send the email here using a provider.
    // For now, we return the content to be displayed/logged on the client.
    console.log(`--- SIMULATING EMAIL SEND on Server for: ${to} ---`);
    return { subject, body };

  } catch (error) {
    console.error("Error generating welcome email content:", error);
    // Re-throw to be caught by the calling function
    throw new Error("Could not generate welcome email content.");
  }
}
