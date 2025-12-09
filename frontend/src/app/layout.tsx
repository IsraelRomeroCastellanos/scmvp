// src/app/layout.tsx
import './globals.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Inter } from 'next/font/google';
import Navbar from '@/components/Navbar'; // ✅ AÑADIDO

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Sistema de Cumplimiento MVP',
  description: 'Plataforma integral de gestión de cumplimiento',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${inter.className} min-h-screen bg-gray-50 flex flex-col`}>
        <Navbar /> {/* ✅ AÑADIDO */}
        <main className="flex-grow container mx-auto px-4 py-8">
          {children}
        </main>
        <ToastContainer 
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </body>
    </html>
  );
}