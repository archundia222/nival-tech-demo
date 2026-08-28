# Subir la demo a GitHub

## Opción rápida desde GitHub.com
1. Crea un repositorio nuevo, por ejemplo `nival-tech-demo`.
2. Déjalo público si quieres usar GitHub Pages sin complicaciones.
3. Dentro del repo, usa **Add file → Upload files**.
4. Arrastra todos los archivos de esta carpeta (no subas solo el ZIP).
5. Escribe un mensaje como `Initial NIVAL tech demo`.
6. Pulsa **Commit changes**.

## Publicar con GitHub Pages
1. En el repositorio entra a **Settings**.
2. Entra a **Pages**.
3. En “Build and deployment”, elige **Deploy from a branch**.
4. Branch: `main`.
5. Folder: `/ (root)`.
6. Guarda.
7. GitHub mostrará la URL pública cuando el sitio esté publicado.

Después puedes programar tus NFC con:
- `https://TU-USUARIO.github.io/nival-tech-demo/`
- `https://TU-USUARIO.github.io/nival-tech-demo/reviews.html`
- `https://TU-USUARIO.github.io/nival-tech-demo/loyalty.html`

## Con Git por terminal
```bash
git init
git add .
git commit -m "Initial NIVAL tech demo"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/nival-tech-demo.git
git push -u origin main
```

> Recuerda: esta versión es demo. No la uses para datos reales de clientes.
