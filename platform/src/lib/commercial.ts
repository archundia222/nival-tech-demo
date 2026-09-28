import { currentPricing } from './pricing';
export const NIVAL_TRIAL_DAYS = currentPricing.trialDays;
export const NIVAL_POINTS_FREE_CUSTOMER_LIMIT = currentPricing.pointsFreeCustomerLimit;
export const NIVAL_POINTS_PRO_TRIAL_DAYS = currentPricing.pointsProTrialDays;

// Launch/founder pricing charged during the current validation phase.
export const NIVAL_PAY_FOUNDER_PRICE_CENTS = currentPricing.payCents;
export const NIVAL_POINTS_FOUNDER_PRICE_CENTS = currentPricing.pointsMonthlyCents;
export const NIVAL_REVIEWS_PRO_PRICE_CENTS = currentPricing.reviewsCents;
export const NIVAL_WIFI_PRO_PRICE_CENTS = currentPricing.wifiCents;

// Published post-launch reference prices. These are not charged until the launch offer closes.
export const NIVAL_PAY_REGULAR_PRICE_CENTS = currentPricing.payRegularCents;
export const NIVAL_POINTS_REGULAR_PRICE_CENTS = currentPricing.pointsRegularCents;

// Nival Growth = Nival Puntos + Nival Intelligence.
export const NIVAL_GROWTH_PRICE_CENTS = currentPricing.growthCents;

export function mxn(amountCents: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
}

export function trialEndsAt(days = NIVAL_POINTS_PRO_TRIAL_DAYS) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}
