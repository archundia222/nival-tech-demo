# Asistente Nival — activación y límites

Implementación en `src/app/dashboard/assistant` y `src/app/api/assistant`.

## Activación

1. Ejecutar `supabase/migrations/0015_fix_recommendation_role.sql` para conservar la corrección ya probada (no altera roles de usuarios).
2. Ejecutar una vez `supabase/migrations/0016_nival_assistant.sql` en el SQL Editor de Supabase. Crea conversaciones, mensajes, memoria, cuotas, políticas y funciones; no modifica clientes ni visitas existentes.
3. En Vercel, proyecto `nival-tech-platform`, configurar variables privadas de servidor `OPENAI_API_KEY` y `OPENAI_MODEL` con un modelo de texto compatible con Responses habilitado en la cuenta. Verificar que `SUPABASE_SERVICE_ROLE_KEY` ya esté configurada. No copiar secretos a GitHub, capturas ni conversaciones.
4. Compilar y desplegar tras resolver el lockfile inválido descrito abajo.
5. Abrir `/dashboard/assistant`, crear conversación, preguntar por visitas y recargar. Verificar que persistan ambos mensajes, guardar una preferencia en Memoria, abrir otra conversación y consultar esa preferencia.
6. Verificar con una segunda cuenta y otro negocio que no se pueden leer ni escribir conversaciones ajenas; probar staff, sesión cerrada, cuota y borrado.

## Comportamiento

- Acceso de propietarios y administradores. Cada conversación es privada por usuario y negocio.
- Memoria explícita compartida por propietarios y administradores del negocio; editable y borrable dejando el campo vacío. No hay aprendizaje ni extracción automática de memoria.
- Contexto actual con conteos completos, muestra de 50 clientes y 10 campañas, programas activos; sin correos, teléfonos ni cuentas bancarias. Sin resultados de campañas, ingresos o gastos inventados.
- Hasta 20 mensajes recientes (24000 caracteres) por consulta; visualización de los 100 mensajes más recientes. Historial completo guardado hasta borrar conversación.
- 30 intentos diarios por usuario y negocio, día UTC, incluida una reserva de 60 segundos para evitar peticiones simultáneas. Los fallos del proveedor cuentan como intento.
- Clave de OpenAI y servicio Supabase solo en servidor. Mensajes escritos únicamente por el servidor. Responses usa `store: false`; eso no equivale a una promesa de retención cero del proveedor.
- No envía mensajes, ejecuta campañas ni modifica datos del negocio desde el modelo.

## Validación realizada

- Comprobación de sintaxis TypeScript/TSX: pasó.
- `node tests/assistant-route.cjs` (requiere instalar devDependencies): prueba con proveedor y base simulados origen, sesión, rol, conversación no disponible, configuración, cuota, persistencia acotada al usuario/negocio, timeout y longitud. Sin solicitudes reales ni secretos.
- `git diff --check`: pasó.
- No se ejecutó una llamada real a OpenAI ni la migración en Supabase; tampoco se verificó visualmente la interfaz autenticada.
- Bloqueo de build existente: `package-lock.json` en el commit base e830dcc contiene bytes no JSON, confirmado también en GitHub. `npm ci --offline` lo rechaza. Se conserva sin modificación; requiere reparación y build antes de publicar esta propuesta. La instalación con red no llegó a ejecutarse porque su aprobación de red fue cancelada.

Referencia API: https://developers.openai.com/api/docs/guides/migrate-to-responses
