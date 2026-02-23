import { useState, useEffect } from 'react';
import { locales, Locale } from './locales';

let globalLocale: Locale = (localStorage.getItem('app-locale') as Locale) || 'id';
const listeners = new Set<(locale: Locale) => void>();

export const setGlobalLocale = (locale: Locale) => {
  globalLocale = locale;
  localStorage.setItem('app-locale', locale);
  listeners.forEach(fn => fn(locale));
};

export const useLocale = () => {
  const [locale, setLocale] = useState<Locale>(globalLocale);

  useEffect(() => {
    const handler = (l: Locale) => setLocale(l);
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  return {
    locale,
    setLocale: setGlobalLocale,
    t: locales[locale],
  };
};
