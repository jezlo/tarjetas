import { useLanguage } from '../contexts/LanguageContext';

/**
 * useTranslation returns a `t` function that resolves a dot-separated
 * translation key and interpolates optional variables.
 *
 * @example
 * const { t } = useTranslation();
 * t('login.signIn')                        // "Sign In" | "Iniciar sesión"
 * t('dashboard.welcomeBack', { name: 'Ana' }) // "Welcome back, Ana!" | "¡Bienvenida de nuevo, Ana!"
 *
 * ### Interpolation syntax
 * Wrap variable names with curly braces in the JSON value: `"Hello, {name}!"`
 * Then pass the values as the second argument: `t('key', { name: 'Ana' })`.
 */
export function useTranslation() {
  const { translations, language } = useLanguage();

  function t(key, vars) {
    const parts = key.split('.');
    let value = translations;
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        value = undefined;
        break;
      }
    }

    if (typeof value !== 'string') {
      // Key not found — return the key itself as a fallback so the UI never
      // shows a blank string.
      return key;
    }

    if (vars && typeof vars === 'object') {
      return value.replace(/\{(\w+)\}/g, (_, varName) => {
        return vars[varName] !== undefined ? String(vars[varName]) : `{${varName}}`;
      });
    }

    return value;
  }

  return { t, language };
}
