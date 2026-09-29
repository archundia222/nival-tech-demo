import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
 const base=process.env.NEXT_PUBLIC_SITE_URL??'https://nival-tech-platform.vercel.app';
 return [
  {url:base,changeFrequency:'weekly',priority:1},
  {url:`${base}/products`,changeFrequency:'weekly',priority:.8},
  {url:`${base}/support`,changeFrequency:'monthly',priority:.6},
  {url:`${base}/privacy`,changeFrequency:'yearly',priority:.3},
  {url:`${base}/terms`,changeFrequency:'yearly',priority:.3},
  {url:`${base}/cookies`,changeFrequency:'yearly',priority:.2},
  {url:`${base}/refunds`,changeFrequency:'yearly',priority:.2},
 ];
}
