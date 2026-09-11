"use client";

import { useState } from "react";

export function InvitationLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return <button className="visitButton" type="button" onClick={copy}>{copied ? "Copiado" : "Copiar invitación"}</button>;
}
