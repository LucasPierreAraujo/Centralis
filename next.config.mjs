import withPWA from 'next-pwa';

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', // Desabilita PWA em desenvolvimento
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Usar webpack ao invés de turbopack para compatibilidade com next-pwa
  turbopack: {},

  // Configuração experimental para aumentar limite de body size
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },

  // Headers de segurança
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY', // Previne clickjacking
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff', // Previne MIME sniffing
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block', // Proteção XSS (navegadores antigos)
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()', // Bloqueia permissões desnecessárias
          },
        ],
      },
    ];
  },
};

export default pwaConfig(nextConfig);
