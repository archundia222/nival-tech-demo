"use client";

import { QRCodeSVG } from "qrcode.react";

export function ReviewQr({ value }: { value: string }) {
  return <div className="reviewQrBox"><QRCodeSVG value={value} size={210} level="M" bgColor="#ffffff" fgColor="#111318" /></div>;
}
