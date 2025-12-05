// frontend/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // ✅ REESCRITURAS DEFINITIVAS - funciona en todos los entornos
  async rewrites() {
    // ✅ DETERMINAR URL DE BACKEND SEGÚN ENTORNO
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 
                      (process.env.NODE_ENV === 'production' 
                         ? 'https://plataforma-cumplimiento-mvp.onrender.com' 
                         : 'http://localhost:10000');
    
    console.log('🌐 Configurando proxy a:', backendUrl);
    
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/cliente/registrar-cliente',
        destination: '/registrar-cliente',
      }
    ];
  },
  
  // ✅ CABECERAS CORS PARA TODAS LAS SOLICITUDES
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',  // ✅ PERMITIR TODOS LOS ORÍGENES PARA LAS API
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;