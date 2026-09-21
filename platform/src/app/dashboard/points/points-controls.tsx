"use client";

import { useState, useTransition } from "react";
import { updatePointsProgram } from "@/app/points/actions";

export function PointsProgramForm({ program }: { program: { name: string; reward_threshold: number; reward_description: string; point_cooldown_minutes: number; daily_points_cap: number } }) {
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  return <form className="pointsProgramForm" action={(formData) => startTransition(async () => {
    const result = await updatePointsProgram(formData);
    setMessage(result.ok ? "Programa guardado." : result.error ?? "No pudimos guardar.");
  })}>
    <label>Nombre del programa<input name="name" defaultValue={program.name} required minLength={2} maxLength={80} /></label>
    <div className="pointsFormGrid">
      <label>Meta de puntos<input name="threshold" type="number" min={1} max={1000} defaultValue={program.reward_threshold} required /></label>
      <label>Tope diario<input name="dailyCap" type="number" min={1} max={100} defaultValue={program.daily_points_cap} required /></label>
      <label>Espera entre puntos (min)<input name="cooldown" type="number" min={0} max={1440} defaultValue={program.point_cooldown_minutes} required /></label>
    </div>
    <label>Premio<input name="reward" defaultValue={program.reward_description} required minLength={2} maxLength={160} /></label>
    <button className="nvPrimaryButton" disabled={pending} type="submit">{pending ? "Guardando…" : "Guardar programa"}</button>
    {message && <p className="pointsStatus">{message}</p>}
  </form>;
}
