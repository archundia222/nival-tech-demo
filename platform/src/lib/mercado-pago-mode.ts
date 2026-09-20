export function isMercadoPagoTestMode(accessToken: string) {
  return accessToken.trim().startsWith('TEST-');
}

export function isCompatibleMercadoPagoOrderId(orderId: string, accessToken: string) {
  const isTestOrder = orderId.toUpperCase().startsWith('ORDTST');
  return isMercadoPagoTestMode(accessToken) ? isTestOrder : !isTestOrder;
}
