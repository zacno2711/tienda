import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Bricolage_Grotesque } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import AuthGuard from '@/components/AuthGuard'

const brico = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-brico', display: 'swap' })

// La app protege todas las rutas con sesión del lado del cliente (AuthGuard),
// así que se excluye de la validación de navegación instantánea de Next.js.
export const instant = false

export const metadata: Metadata = {
  title: 'Tienda de Dulces',
  description: 'Sistema de inventario y ventas',
}

// Fija el tema antes de pintar para evitar el parpadeo: la elección guardada,
// o el tema del sistema si no hay ninguna.
const themeScript = `(function(){try{var t=localStorage.getItem('tienda_theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){}})()`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={brico.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen">
        <AuthProvider>
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-zinc-400">Cargando...</div>}>
            <AuthGuard>{children}</AuthGuard>
          </Suspense>
        </AuthProvider>
      </body>
    </html>
  )
}
