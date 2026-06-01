import type { Locale } from './types';
import { defaultLocale } from './types';

const loaders = {
  en: () => import('./messages/en').then((module) => module.en),
  ar: () => import('./messages/ar').then((module) => module.ar),
};

/**
 * getDictionary
 *
 * @description Standardized execution for getDictionary.
 */
export const getDictionary = async (locale: Locale) => {
  return loaders[locale]?.() ?? loaders[defaultLocale]();
};
