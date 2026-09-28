export const locales = ["es-AR", "es-MX", "en-US", "en-UK"] as const;
export type AppLocale = typeof locales[number];