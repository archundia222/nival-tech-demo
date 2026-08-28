# NIVAL tech — Demo comercial

Demo estática para validar el producto inicial de NIVAL tech con barberías.

## Qué incluye
- Landing de negocio
- Página de reseñas demo
- Programa de lealtad
- Registro / acceso de clientes
- Tarjeta digital con progreso
- Solicitud de visita
- Validación por personal autorizado
- Regla de 1 visita por cliente por día
- Historial/auditoría básica en `localStorage`
- Dashboard NIVAL Intelligence con segmentación ilustrativa

## Credenciales demo
**Cliente existente**
- Teléfono: `5511111111`

**Empleado**
- Correo: `staff@nival.demo`
- Contraseña: `demo1234`

**Dueño**
- Correo: `owner@nival.demo`
- Contraseña: `nival2026`

## Ejecutar localmente
Puedes abrir `index.html` directamente, pero para evitar diferencias entre navegadores es mejor usar un servidor local:

### Con VS Code
Instala la extensión **Live Server** y abre `index.html` con “Open with Live Server”.

### Con Python
```bash
python -m http.server 8000
```
Después abre `http://localhost:8000`.

## Limitación importante
Esta versión usa `localStorage`. Es una demo de ventas, no producción:
- los datos viven solo en ese navegador;
- teléfono y laptop no sincronizan entre sí;
- las credenciales están visibles en el código;
- no hay base de datos remota real.

Después de validar la propuesta con negocios reales, el siguiente paso es migrar la persistencia y autenticación a un backend real (por ejemplo Supabase/PostgreSQL) y agregar aislamiento por negocio.

## Rutas útiles para NFC
Una vez publicada:
- `index.html` → NFC de información del negocio
- `reviews.html` → NFC de reseñas
- `loyalty.html` → NFC de lealtad

El panel:
- `staff.html`
- `intelligence.html`

## Configurar botón “Quiero consejo”
En `app.js`, busca:

```js
advisorWhatsapp:""
```

y escribe el número del asesor con código de país y solo dígitos, por ejemplo:

```js
advisorWhatsapp:"5215512345678"
```

Cada recomendación de `NIVAL Intelligence` tendrá un botón **Quiero consejo por WhatsApp** que abre una conversación con un mensaje prellenado incluyendo el negocio, contexto detectado y una pregunta específica.

## Contacto configurado en esta demo
- WhatsApp asesor: `+52 55 3904 4788`
- Instagram: `@archundia_222`

## Datos bancarios
La landing incluye campos separados para:
- Nombre de la cuenta / titular
- Alias o concepto
- Número de cuenta
- CLABE

Cada campo tiene botón **Copiar**. Los valores actuales son de demostración; reemplázalos por los datos reales del negocio antes de usarlo con clientes.
