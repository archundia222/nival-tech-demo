// Temporary live-payment QA price. Restore catalog prices after real-flow validation:
// Pay 19900, additional Pay 4900, section 1000, Points 19900,
// Intelligence 39900, and Points + Intelligence 44900.
export const NIVAL_PAY_PRICE_CENTS = 1000;
export const NIVAL_PAY_PRODUCT = 'nival_pay';

export function money(amountCents: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amountCents / 100);
}


export const NIVAL_PAY_ADDITIONAL_PRICE_CENTS = 1000;
export const NIVAL_PAY_ADDITIONAL_PRODUCT = 'nival_pay_additional';

export const NIVAL_PAY_EXTRA_SECTION_PRICE_CENTS = 1000;
export const NIVAL_PAY_EXTRA_SECTION_PRODUCT = 'nival_pay_extra_section';

export const NIVAL_PAY_PHYSICAL_CARD_PRICE_CENTS = 9900;
export const NIVAL_PAY_PHYSICAL_CARD_PRODUCT = 'nival_pay_physical_card';

export const NIVAL_POINTS_PRODUCT = 'nival_points';
export const NIVAL_INTELLIGENCE_PRODUCT = 'nival_intelligence';
export const NIVAL_POINTS_INTELLIGENCE_PRODUCT = 'nival_points_intelligence';
export const NIVAL_POINTS_PRICE_CENTS = 1000;
export const NIVAL_INTELLIGENCE_PRICE_CENTS = 1000;
export const NIVAL_POINTS_INTELLIGENCE_PRICE_CENTS = 1000;
