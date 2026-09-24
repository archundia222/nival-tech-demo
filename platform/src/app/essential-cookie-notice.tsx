"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "nival-essential-cookie-notice-v1";

export function EssentialCookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        setVisible(window.localStorage.getItem(STORAGE_KEY) !== "dismissed");
      } catch {
        setVisible(true);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (!visible) return null;

  return (
    <aside className="cookieNotice" role="region" aria-label="Aviso sobre cookies">
      <div>
        <strong>Cookies necesarias</strong>
        <p>Nival usa cookies de sesión necesarias para iniciar sesión y mantener tu cuenta segura. Actualmente no instalamos cookies publicitarias ni de analítica de terceros.</p>
      </div>
      <div className="cookieNoticeActions">
        <Link href="/cookies">Ver política de cookies</Link>
        <button
          type="button"
          onClick={() => {
            try { window.localStorage.setItem(STORAGE_KEY, "dismissed"); } catch {}
            setVisible(false);
          }}
        >
          Entendido
        </button>
      </div>
    </aside>
  );
}
