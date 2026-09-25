export const NIVAL_TRIAL_DAYS = 7;
export const NIVAL_POINTS_FREE_CUSTOMER_LIMIT = 30;

// Launch/founder pricing charged during the current validation phase.
export const NIVAL_PAY_FOUNDER_PRICE_CENTS = 19900;
export const NIVAL_POINTS_FOUNDER_PRICE_CENTS = 19900;

// Published post-launch reference prices. These are not charged until the launch offer closes.
export const NIVAL_PAY_REGULAR_PRICE_CENTS = 29900;
export const NIVAL_POINTS_REGULAR_PRICE_CENTS = 24900;

// Nival Growth = Nival Puntos + Nival Intelligence.
export const NIVAL_GROWTH_PRICE_CENTS = 44900;

export function mxn(amountCents: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
}

export function trialEndsAt(days = NIVAL_TRIAL_DAYS) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}
