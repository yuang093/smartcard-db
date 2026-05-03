/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['card.yuang093.cc'],
  
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://backend:8000/api/v1/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: 'http://backend:8000/api/v1/static/:path*',
      },
    ];
  },
  
  // Increase API timeout and body size limits for file uploads (AI OCR)
  async headers() {
    return [
      {
        source: '/api/v1/:path*',
        headers: [
          { key: 'connection', value: 'keep-alive' },
        ],
      },
    ];
  },
};

// Increase body parser limit for file uploads
module.exports = nextConfig;