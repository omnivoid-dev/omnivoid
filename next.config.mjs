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
    // The PDF reader library mentions the Node-only 'canvas' package; it is never needed (we draw on browser canvases)
    config.resolve.alias = { ...config.resolve.alias, canvas: false };

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
    // Which sites may show the public pages in an iframe. Set EMBED_ALLOWED_ORIGINS in Vercel to restrict it,
    // e.g. "https://client-site.com https://www.client-site.com". Empty means any site may embed (public pages only).
    const embedOrigins = (process.env.EMBED_ALLOWED_ORIGINS || '').trim();
    const frameAncestors = embedOrigins ? `frame-ancestors 'self' ${embedOrigins}` : 'frame-ancestors *';

    const common = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-XSS-Protection', value: '1; mode=block' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'encrypted-media=(), autoplay=(), microphone=(), camera=()' },
    ];

    return [
      {
        // Public site: embeddable (X-Frame-Options cannot name specific sites, so frame-ancestors is used instead)
        source: '/((?!admin|api/admin).*)',
        headers: [...common, { key: 'Content-Security-Policy', value: frameAncestors }],
      },
      {
        // Admin pages and admin API: never embeddable, so they cannot be framed for clickjacking
        source: '/admin/:path*',
        headers: [...common, { key: 'X-Frame-Options', value: 'DENY' }, { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" }],
      },
      {
        source: '/api/admin/:path*',
        headers: [...common, { key: 'X-Frame-Options', value: 'DENY' }, { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" }],
      },
    ];
  },
};

export default nextConfig;