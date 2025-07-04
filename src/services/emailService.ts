
'use server';

import { getTranslations } from 'next-intl/server';
import { Resend } from 'resend';

/**
 * @fileOverview A service for sending emails using Resend.
 * It reads the API key from environment variables. If the key is not present,
 * it falls back to logging the email content to the console for development.
 */

interface WelcomeEmailParams {
  to: string;
  name: string;
  locale: string;
}

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
// Use a no-reply address from your verified domain in Resend
const fromAddress = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

/**
 * Sends a welcome email to a new user.
 * @param {WelcomeEmailParams} params - The email parameters.
 */
export async function sendWelcomeEmail({ to, name, locale }: WelcomeEmailParams): Promise<void> {
  try {
    const t = await getTranslations({ locale, namespace: 'WelcomeEmail' });

    const subject = t('subject');
    const bodyText = t('body_text', { name });
    const bodyHtml = t.rich('body_html', {
      name,
      // eslint-disable-next-line react/display-name
      h2: (chunks) => `<h2>${chunks}</h2>`,
      // eslint-disable-next-line react/display-name
      p: (chunks) => `<p>${chunks}</p>`,
      // eslint-disable-next-line react/display-name
      ul: (chunks) => `<ul>${chunks}</ul>`,
      // eslint-disable-next-line react/display-name
      li: (chunks) => `<li>${chunks}</li>`,
      // eslint-disable-next-line react/display-name
      strong: (chunks) => `<strong>${chunks}</strong>`,
    });

    if (!resend || !resendApiKey || resendApiKey.includes('REPLACE_WITH')) {
      console.warn("--- RESEND_API_KEY is not configured. Simulating email send. ---");
      console.log(`To: ${to}`);
      console.log(`From: ${fromAddress}`);
      console.log(`Subject: ${subject}`);
      console.log("--- Email Body (HTML) ---");
      console.log(bodyHtml);
      console.log("--- End of Simulated Email ---");
      return;
    }

    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: [to],
      subject: subject,
      html: bodyHtml,
      text: bodyText,
    });

    if (error) {
      // Log the error but don't re-throw, so user creation doesn't fail.
      console.error(`Resend API error sending email to ${to}:`, error);
      return;
    }

    console.log(`Successfully sent welcome email to ${to}. Message ID: ${data?.id}`);

  } catch (error) {
    console.error("Error in sendWelcomeEmail service:", error);
    // Do not re-throw here to prevent user creation from failing if email fails.
  }
}
