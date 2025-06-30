import {createLocalizedPathnamesNavigation} from 'next-intl/navigation';

export const locales = ['en', 'fr'] as const;

export const {Link, redirect, usePathname, useRouter} =
  createLocalizedPathnamesNavigation({
    locales,
    pathnames: {},
  });
