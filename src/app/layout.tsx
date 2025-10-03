import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AppProvider } from '@/contexts/AppContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Analizador y Optimizador de Currículum',
  description: 'Herramienta de análisis y mejora de currículum optimizada para ATS (Análisis con IA) con retroalimentación desde múltiples perspectivas',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es-MX" className="scroll-smooth">
      <body className={`${inter.className} transition-colors duration-200`}>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  )
}
