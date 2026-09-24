import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nival-tech-platform.vercel.app';
  return {
    rules: [
      { userAgent: '*', allow: ['/', '/products', '/support', '/privacy', '/terms'], disallow: ['/dashboard', '/checkout', '/auth'] },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
