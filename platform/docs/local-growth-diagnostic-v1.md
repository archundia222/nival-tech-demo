# Local Growth Diagnostic V1

Objetivo: herramienta interna para convertir una conversación sobre reseñas en un diagnóstico gratuito, verificable y honesto de presencia local.

## Flujo
Prospecto → negocio en Google → datos públicos → competidores comparables → fortalezas/oportunidades → recomendación → estado comercial.

## Principios
- No inventar scores.
- No garantizar posiciones.
- No recomendar mensualidad si la evidencia no la justifica.
- Reseñas reales; sin incentivos, reseñas falsas ni manipulación.
- El cliente no necesita usar un dashboard.

## Dependencia para activar
Variable de servidor: GOOGLE_PLACES_API_KEY.
La clave debe restringirse a la API necesaria y no exponerse al navegador.

## Próximas iteraciones
1. Búsqueda por nombre/dirección y selector de negocio.
2. Descubrimiento automático de competidores comparables.
3. Guardado de diagnósticos y estados comerciales en Supabase.
4. Integración con el CRM de prospectos.
5. Reporte comercial móvil y seguimiento.
