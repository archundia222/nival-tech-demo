# Nival Tech Platform

Aplicación comercial en construcción. La demo estática permanece en la raíz del repositorio hasta que este núcleo alcance paridad funcional.

## Desarrollo local

```bash
npm install
cp .env.example .env.local
npm run dev
```

La migración inicial de PostgreSQL está en `supabase/migrations/0001_initial_schema.sql`.

La conexión usa clientes Supabase separados para navegador y servidor. El endpoint `GET /api/health` comprueba que las variables públicas y el servicio de autenticación estén disponibles sin exponer secretos.

## Principio de seguridad

Toda entidad operativa incluye `business_id`. Las políticas RLS comprueban la membresía del usuario antes de permitir acceso. Las claves de servicio nunca deben exponerse en el navegador.
