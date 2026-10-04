"use client";

import { usePathname } from "next/navigation";

const WHATSAPP_URL =
  "https://wa.me/525539044788?text=Hola%2C%20quiero%20informaci%C3%B3n%20sobre%20Nival%20Pay";

export function WhatsAppSticky() {
  const pathname = usePathname();
  const visible =
    pathname === "/" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/negocio") ||
    pathname.startsWith("/business");

  if (!visible) return null;

  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactar por WhatsApp"
      title="Contactar por WhatsApp"
      className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-[100] flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-[#25D366]/30 sm:bottom-6 sm:right-6 sm:h-auto sm:w-auto sm:gap-2 sm:px-5 sm:py-3"
    >
      <svg aria-hidden="true" viewBox="0 0 32 32" className="h-7 w-7 fill-current">
        <path d="M19.11 17.21c-.26-.13-1.54-.76-1.78-.85-.24-.09-.41-.13-.59.13-.17.26-.67.85-.82 1.02-.15.17-.3.2-.56.07-.26-.13-1.09-.4-2.08-1.29-.77-.69-1.29-1.53-1.44-1.79-.15-.26-.02-.4.11-.53.12-.12.26-.3.39-.46.13-.15.17-.26.26-.43.09-.17.04-.33-.02-.46-.07-.13-.59-1.41-.8-1.93-.21-.51-.43-.44-.59-.45h-.5c-.17 0-.46.07-.7.33-.24.26-.91.89-.91 2.17s.93 2.52 1.06 2.69c.13.17 1.83 2.8 4.44 3.93.62.27 1.1.43 1.48.55.62.2 1.19.17 1.64.1.5-.07 1.54-.63 1.76-1.24.22-.61.22-1.13.15-1.24-.06-.11-.24-.17-.5-.3Z"/>
        <path d="M16.03 3C8.85 3 3.02 8.82 3.02 16c0 2.29.6 4.53 1.73 6.5L3 29l6.66-1.75A12.95 12.95 0 0 0 16.03 29C23.2 29 29.03 23.18 29.03 16S23.2 3 16.03 3Zm0 23.8c-2.05 0-4.05-.55-5.79-1.58l-.41-.24-3.95 1.04 1.05-3.85-.27-.43A10.73 10.73 0 0 1 5.22 16c0-5.96 4.85-10.8 10.81-10.8 5.96 0 10.8 4.84 10.8 10.8 0 5.96-4.84 10.8-10.8 10.8Z"/>
      </svg>
      <span className="hidden text-sm font-semibold sm:inline">WhatsApp</span>
    </a>
  );
}
