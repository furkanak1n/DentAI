import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DentAI - Bulanik Mantik Karar Destek Sistemi",
  description:
    "Bulanik mantik tabanli dis hekimligi karar destek sistemi. Dolgu mu, kanal tedavisi mi?",
};

function ToothIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M32 4c-6 0-10 2-13 5s-5 8-5 14c0 4 1 8 2 12 1.5 5 3 10 3.5 14 .5 4 1.5 8 4 11 1.5 1.8 3.5 3 5.5 3s3-1 4-3c1.2-2.5 1.8-5.5 2-8h0c.2 2.5.8 5.5 2 8 1 2 2 3 4 3s4-1.2 5.5-3c2.5-3 3.5-7 4-11 .5-4 2-9 3.5-14 1-4 2-8 2-12 0-6-2-11-5-14S38 4 32 4z" />
    </svg>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-sky-100 shadow-sm">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <ToothIcon className="w-9 h-9 text-sky-500" />
                <span className="absolute -bottom-0.5 -right-0.5 text-[10px]">
                  +
                </span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800 leading-tight">
                  DentAI
                </h1>
                <p className="text-[10px] text-sky-500 font-medium tracking-wider uppercase">
                  Karar Destek Sistemi
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="hidden sm:inline px-2 py-1 bg-sky-50 text-sky-600 rounded-full font-medium">
                Mamdani Cikarim
              </span>
              <span className="hidden sm:inline px-2 py-1 bg-cyan-50 text-cyan-600 rounded-full font-medium">
                599 Kural
              </span>
            </div>
          </div>
        </header>

        {/* Main content */}
        {children}

        {/* Footer */}
        <footer className="mt-auto border-t border-sky-100 bg-white/60 backdrop-blur-sm">
          <div className="max-w-5xl mx-auto px-4 py-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-slate-400">
                <ToothIcon className="w-5 h-5" />
                <span className="text-sm font-medium">DentAI</span>
                <span className="text-xs">Bulanik Mantik Projesi</span>
              </div>
              <div className="text-center text-xs text-slate-400 leading-relaxed">
                <p>
                  Bu sistem tani koyma amaci tasimaz. Sadece karar destek araci
                  olarak tasarlanmistir.
                </p>
                <p className="mt-1">
                  Mamdani Cikarim &bull; T-norm: min &bull; Centroid
                  Durulastirma
                </p>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
