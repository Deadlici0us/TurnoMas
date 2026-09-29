/** @type {import("next-intl").NextIntlConfig} */
const config = {
  // Configure locales supported
  locales: ["es-AR", "es-MX", "en-US", "en-UK"],
  
  // Set default locale
  defaultLocale: "es-AR",
  
  // Global setting: allow changing locale from UI
  localeDetection: false,
  
  // Pathnames to internationalize
  // These accept a locale segment at the beginning, e.g. /en-US/, /ar/, etc.
  // `*` serves as a catch-all for untranslated paths
  pathnames: {
    "/": "/",
    "/features": "/features",
    "/pricing": "/pricing",
    "/login": "/login",
    "/register": "/register",
    "/onboarding": "/onboarding",
    "/dashboard": "/dashboard",
    "/:locale": "/:locale",
    "/:locale/:path*": "/:locale/:path*"
  }
};

export default config;