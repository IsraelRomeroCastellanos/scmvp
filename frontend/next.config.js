// frontend/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  async rewrites() {
    // ✅ URL CORRECTA: scmvp.onrender.com
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 
                      (process.env.NODE_ENV === 'production' 
                         ? 'https://scmvp.onrender.com'  // ← CORREGIDO
                         : 'http://localhost:10000');
    
    console.log('🌐 Configurando proxy a:', backendUrl);
    
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      }
    ];
  },
  
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
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