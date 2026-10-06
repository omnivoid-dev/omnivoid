/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React Strict Mode for better development experience
  reactStrictMode: true,
  
  // Removed output: 'standalone' for better Vercel compatibility
  
  // Enable experimental features
  experimental: {
    // Optimize package imports
    optimizePackageImports: ['framer-motion'],
  },
  
  // Configure images
  images: {
    domains: ['drive.google.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.in',
      },
    ],
  },
  
  // Webpack configuration for canvas and audio
  webpack: (config, { isServer }) => {
    // Handle canvas for visual components
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        'audio-context': false,
      };
    }
    
    return config;
  },
  
  // Redirects for legacy paths
  async redirects() {
    return [
      // Redirect old index.html to new home
      {
        source: '/index.html',
        destination: '/',
        permanent: true,
      },
    ];
  },
  
  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'encrypted-media=(), autoplay=(), microphone=(), camera=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;