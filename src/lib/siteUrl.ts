/** The public origin used for canonical URLs, the sitemap and structured data. Set NEXT_PUBLIC_SITE_URL in production. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://omnivoidlabs.vercel.app').replace(/\/$/, '');
