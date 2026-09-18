export const NIVAL_PAY_PRICE_CENTS = 19900;
export const NIVAL_PAY_PRODUCT = 'nival_pay';

export function money(amountCents: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amountCents / 100);
}


export const NIVAL_PAY_EXTRA_SECTION_PRICE_CENTS = 1000;
export const NIVAL_PAY_EXTRA_SECTION_PRODUCT = 'nival_pay_extra_section';
