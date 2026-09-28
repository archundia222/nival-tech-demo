import { NIVAL_GROWTH_PRICE_CENTS, NIVAL_PAY_FOUNDER_PRICE_CENTS, NIVAL_POINTS_FOUNDER_PRICE_CENTS, NIVAL_REVIEWS_PRO_PRICE_CENTS, NIVAL_WIFI_PRO_PRICE_CENTS } from './commercial';
import { currentPricing } from './pricing';

// Production catalog prices.
export const NIVAL_PAY_PRICE_CENTS = NIVAL_PAY_FOUNDER_PRICE_CENTS;
export const NIVAL_PAY_POINTS_PRO_DISCOUNT_PRICE_CENTS = Math.round(NIVAL_PAY_FOUNDER_PRICE_CENTS * 0.10);
export const NIVAL_PAY_PRODUCT = 'nival_pay';
export const NIVAL_REVIEWS_PRODUCT = 'nival_reviews';
export const NIVAL_WIFI_PRODUCT = 'nival_wifi';
export const NIVAL_WIFI_PRICE_CENTS = NIVAL_WIFI_PRO_PRICE_CENTS;
export const NIVAL_REVIEWS_PRICE_CENTS = NIVAL_REVIEWS_PRO_PRICE_CENTS;

export function money(amountCents: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amountCents / 100);
}

export const NIVAL_PAY_ADDITIONAL_PRICE_CENTS = currentPricing.additionalPayCents;
export const NIVAL_PAY_ADDITIONAL_PRODUCT = 'nival_pay_additional';

export const NIVAL_PAY_INCLUDED_SECTIONS = 3;
export const NIVAL_PAY_EXTRA_SECTION_PRICE_CENTS = currentPricing.extraSectionCents;
export const NIVAL_PAY_EXTRA_SECTION_PRODUCT = 'nival_pay_extra_section';

export const NIVAL_PAY_PHYSICAL_CARD_PRICE_CENTS = currentPricing.physicalCardCents;
export const NIVAL_PAY_PHYSICAL_CARD_PRODUCT = 'nival_pay_physical_card';

export const NIVAL_POINTS_PRODUCT = 'nival_points';
export const NIVAL_INTELLIGENCE_PRODUCT = 'nival_intelligence';
export const NIVAL_POINTS_INTELLIGENCE_PRODUCT = 'nival_points_intelligence';
export const NIVAL_POINTS_PRICE_CENTS = NIVAL_POINTS_FOUNDER_PRICE_CENTS;
// Legacy direct-Intelligence checkout. Public pricing now positions Intelligence inside Nival Growth.
export const NIVAL_INTELLIGENCE_PRICE_CENTS = currentPricing.intelligenceCents;
export const NIVAL_POINTS_INTELLIGENCE_PRICE_CENTS = NIVAL_GROWTH_PRICE_CENTS;
export const NIVAL_GROWTH_UPGRADE_PRODUCT = 'nival_growth_upgrade';
export const NIVAL_GROWTH_UPGRADE_PRICE_CENTS = NIVAL_POINTS_INTELLIGENCE_PRICE_CENTS - NIVAL_POINTS_PRICE_CENTS;

export const NIVAL_PAY_PHYSICAL_CARD_CUSTOM_PRICE_CENTS = currentPricing.customPhysicalCardCents;
export const NIVAL_PAY_PHYSICAL_CARD_CUSTOM_PRODUCT = 'nival_pay_physical_card_custom';
export const NIVAL_PAY_CARD_CUSTOMIZATION_PRICE_CENTS = currentPricing.cardCustomizationCents;
export const NIVAL_PAY_CARD_CUSTOMIZATION_PRODUCT = 'nival_pay_card_customization';
