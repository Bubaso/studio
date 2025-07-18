import {getRequestConfig} from 'next-intl/server';
 
export const locales = ['fr', 'en', 'tr'];

export default getRequestConfig(async ({locale}) => {
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) {
      return {
          messages: (await import(`./src/messages/fr.json`)).default
      }
  };
 
  return {
    messages: (await import(`./src/messages/${locale}.json`)).default
  };
});
