import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { SupportedLanguage, TranslationDictionary } from './types';
import { en } from './locales/en';
import { ptBR } from './locales/pt-BR';
import { saveSetting, loadAllSettings } from '../services/storage/indexedDbSettings';

const DICTIONARIES: Record<SupportedLanguage, TranslationDictionary> = {
  en,
  'pt-BR': ptBR,
};

type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

export type TranslationKey = NestedKeyOf<TranslationDictionary>;

interface I18nContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  dictionary: TranslationDictionary;
}

const I18nContext = createContext<I18nContextType | null>(null);

interface I18nProviderProps {
  children: ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    if (typeof navigator !== 'undefined') {
      const navLang = navigator.language?.toLowerCase() || '';
      if (navLang.startsWith('pt')) return 'pt-BR';
    }
    return 'en';
  });

  useEffect(() => {
    async function initLanguage() {
      try {
        const settings = await loadAllSettings();
        if (settings.language === 'en' || settings.language === 'pt-BR' || settings.language === 'es') {
          setLanguageState(settings.language);
        }
      } catch (err) {
        console.warn('Failed to load language setting:', err);
      }
    }
    initLanguage();
  }, []);

  const setLanguage = useCallback(async (newLang: SupportedLanguage) => {
    setLanguageState(newLang);
    await saveSetting('language', newLang);
  }, []);

  const dictionary = DICTIONARIES[language] || DICTIONARIES['en'];

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string => {
      const keys = (key as string).split('.');
      let current: any = dictionary;

      for (const k of keys) {
        if (current && typeof current === 'object' && k in current) {
          current = current[k];
        } else {
          // Fallback to English dictionary if key missing in active language
          let fallback: any = DICTIONARIES['en'];
          for (const fbK of keys) {
            if (fallback && typeof fallback === 'object' && fbK in fallback) {
              fallback = fallback[fbK];
            } else {
              fallback = null;
              break;
            }
          }
          current = fallback || key;
          break;
        }
      }

      if (typeof current !== 'string') {
        return key;
      }

      let result = current;
      if (params) {
        Object.entries(params).forEach(([paramKey, paramVal]) => {
          result = result.replace(new RegExp(`{${paramKey}}`, 'g'), String(paramVal));
        });
      }

      return result;
    },
    [dictionary]
  );

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, dictionary }}>
      {children}
    </I18nContext.Provider>
  );
};

export function getTranslation(
  key: TranslationKey,
  lang?: SupportedLanguage,
  params?: Record<string, string | number>
): string {
  const selectedLang = lang || 'en';
  const dict = DICTIONARIES[selectedLang] || DICTIONARIES['en'];
  const keys = (key as string).split('.');
  let current: any = dict;

  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k];
    } else {
      let fallback: any = DICTIONARIES['en'];
      for (const fbK of keys) {
        if (fallback && typeof fallback === 'object' && fbK in fallback) {
          fallback = fallback[fbK];
        } else {
          fallback = null;
          break;
        }
      }
      current = fallback || key;
      break;
    }
  }

  if (typeof current !== 'string') {
    return key;
  }

  let result = current;
  if (params) {
    Object.entries(params).forEach(([paramKey, paramVal]) => {
      result = result.replace(new RegExp(`{${paramKey}}`, 'g'), String(paramVal));
    });
  }

  return result;
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
}

export function useI18n() {
  return useTranslation();
}

