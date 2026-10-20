This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Crear la base de datos desde cero (Supabase)

1. Crear un proyecto en Supabase.
2. Abrir **SQL Editor** y ejecutar `supabase/migrations/0000_init.sql`.
   Ese único archivo crea tablas, vistas, RLS, funciones, triggers, índices y buckets.
3. Configurar las variables de `.env.example` (o los secrets de Vercel).
4. Registrarse en `/register` y completar el onboarding.

La cuenta demo **no usa la base de datos**: se sirve en memoria desde
`lib/seed/demo-rows.ts` con la cookie `session=demo` y el portal
`/ar/negocio-demo`.

Si la base ya existía con la demo legada, ejecutar una sola vez
`supabase/cleanup-demo.sql` antes de descartar las migraciones viejas.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
