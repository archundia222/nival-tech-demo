export function isValidClabe(value: string) {
  if (!/^\d{18}$/.test(value)) return false;
  const weights = [3, 7, 1];
  const sum = [...value.slice(0, 17)].reduce((total, digit, i) => total + (Number(digit) * weights[i % 3]) % 10, 0);
  return (10 - sum % 10) % 10 === Number(value[17]);
}

export function isHttpsUrl(value: string) {
  if (!value.startsWith('https://') || value.length > 2048 || /\s/.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !!url.hostname && !url.username && !url.password;
  } catch { return false; }
}

export function publicSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://nival-tech-platform.vercel.app').replace(/\/$/, '');
}
