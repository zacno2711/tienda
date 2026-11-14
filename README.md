# Tienda

Sistema de inventario y ventas para un negocio local de dulces: productos, ventas, compras, clientes, cartera (fiado), cierre de caja y usuarios con roles.

Hecho con Next.js, TypeScript, Tailwind CSS y Supabase (Auth + base de datos con RLS).

## Cómo correrlo

1. Instalar dependencias: `npm install`
2. Crear `.env.local` con:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Iniciar: `npm run dev` y abrir http://localhost:3000
