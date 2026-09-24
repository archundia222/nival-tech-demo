import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nival-tech-platform.vercel.app';
  return [
    { url: base, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/products`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/support`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/terms`, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
