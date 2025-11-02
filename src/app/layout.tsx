import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gest\u00e3o de Incidentes \u2014 Plataforma & LP",
  description:
    "Projeto de plataforma educacional e landing page comercial para o programa Gest\u00e3o de Incidentes - Escola Segura.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-[var(--surface-page)] text-slate-900 antialiased">{children}</body>
    </html>
  );
}
