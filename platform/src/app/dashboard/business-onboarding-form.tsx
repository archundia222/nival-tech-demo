"use client";

import { useState } from "react";
import { createBusiness } from "@/app/auth/actions";

function toSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export function BusinessOnboardingForm({ next }: { next: string }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);

  function updateName(value: string) {
    setName(value);
    if (!slugEdited) setSlug(toSlug(value));
  }

  return <form action={createBusiness} className="authForm">
    <input type="hidden" name="next" value={next} />
    <label>
      Nombre del negocio
      <input name="businessName" value={name} onChange={(event) => updateName(event.target.value)} required minLength={2} maxLength={100} placeholder="Ej. Barbería Norte" autoComplete="organization" />
    </label>
    <label>
      Nombre para tu enlace
      <input
        name="businessSlug"
        value={slug}
        onChange={(event) => { setSlugEdited(true); setSlug(toSlug(event.target.value)); }}
        required
        minLength={2}
        maxLength={60}
        placeholder="barberia-norte"
        pattern="[a-z0-9-]+"
        aria-describedby="business-slug-preview"
      />
      <small id="business-slug-preview" className="slugPreview">
        Se crea automáticamente. Tu página será: <strong>nival-tech-platform.vercel.app/p/{slug || "tu-negocio"}</strong>
      </small>
    </label>
    <button className="primaryButton" type="submit">Crear negocio</button>
  </form>;
}
