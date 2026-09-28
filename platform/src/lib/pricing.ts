/** Existing charged prices and proposed V2 prices are intentionally separate. */
export const currentPricing = {
  trialDays: 15,
  pointsFreeCustomerLimit: 10,
  pointsProTrialDays: 7,
  payCents: 19900,
  pointsMonthlyCents: 49900,
  reviewsCents: 9900,
  wifiCents: 9900,
  payRegularCents: 29900,
  pointsRegularCents: 49900,
  growthCents: 74900,
  additionalPayCents: 9900,
  extraSectionCents: 4900,
  physicalCardCents: 9900,
  intelligenceCents: 39900,
  customPhysicalCardCents: 10900,
  cardCustomizationCents: 1000,
} as const;
export const pricingV2 = {
  cards: {
    essential: { name: 'Esencial', priceCents: 9900, description: 'Elige Reseñas o WiFi.', features: ['Reseñas o WiFi a elegir', 'Una tarjeta NFC física', 'Enlace y QR de respaldo'] },
    complete: { name: 'Completa', priceCents: 19900, description: 'Las tres acciones en una tarjeta.', features: ['Pay + Reseñas + WiFi', 'Una tarjeta NFC física', 'Enlace y QR de respaldo'] },
    trialDays: 15,
    upgradeCents: 10000,
    extraSectionCents: 4900,
    extraCardCents: 4900,
    premiumPlasticCents: 9900,
  },
  points: { freeCustomerLimit: 25, monthlyCents: 19900, annualCents: 199000, founderMonthlyCents: 14900, founderLimit: 10, trialDays: 14 },
  intelligence: { availability: 'Lista de espera' },
} as const;

export const previewNotice = 'Precios y paquetes propuestos · la contratación de estos paquetes aún no está disponible.';
export function previewMxn(cents: number) { return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(cents / 100); }
