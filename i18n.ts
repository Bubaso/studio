import {getRequestConfig} from 'next-intl/server';
 
export default getRequestConfig(async ({locale}) => ({
  locale,
  messages: (await import(`./src/messages/${locale}.json`)).default
}));
