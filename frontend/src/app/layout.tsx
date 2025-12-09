// frontend/src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "SCMVP",
  description: "Proyecto SCMVP con Next 14 + TailwindCSS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-gray-100 text-gray-800 min-h-screen">
        {/* Navbar global (no se muestra en /login, eso ya lo decide el componente) */}
        <Navbar />

        {/* Contenedor principal de las vistas */}
        <main className="max-w-7xl mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
