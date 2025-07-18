import {createLocalizedPathnamesNavigation} from 'next-intl/navigation';
import {locales} from './lib/types';

export const {Link, redirect, usePathname, useRouter} =
  createLocalizedPathnamesNavigation({
    locales,
    pathnames: {},
  });
