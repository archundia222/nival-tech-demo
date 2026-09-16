import 'server-only';

export function isNivalAdmin(email?: string | null) {
  if (!email) return false;
  const allowed = (process.env.NIVAL_ADMIN_EMAILS ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}

