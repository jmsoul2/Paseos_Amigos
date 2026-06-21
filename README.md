# Cuentas del Paseo

Divisor de gastos para un paseo entre amigos. Matriz tipo Excel: cada uno marca su
chulo (✓) en los gastos en que participó, y la app calcula en vivo **quién le debe a
quién** con el mínimo de transferencias.

- **Stack**: vanilla (HTML/CSS/JS, sin build). Backend de sincronización: Supabase (en camino).
- **Probar local**: abre `src/index.html`, o corre `npm run dev` (= `npx serve src`).

---

## Desplegar a GitHub Pages

El sitio es 100% estático y se publica desde `src/` con GitHub Actions
(`.github/workflows/deploy.yml`). Pasos:

### 1. Crear el repo en GitHub
Entra a https://github.com/new y crea un repo **público** llamado `cuentas-paseo`.
**No** marques "Add a README" (este repo ya tiene archivos).

### 2. Subir el código
En la carpeta del proyecto:

```bash
git remote add origin https://github.com/TU_USUARIO/cuentas-paseo.git
git branch -M main
git push -u origin main
```

### 3. Activar Pages
En el repo: **Settings › Pages › Build and deployment › Source: GitHub Actions**.
El workflow corre solo en cada push; en ~1 min tendrás la URL
`https://TU_USUARIO.github.io/cuentas-paseo/`.

### Actualizaciones futuras
`git add -A && git commit -m "..." && git push` → Pages republica solo.

---

## Sincronización en vivo (Supabase) — pendiente
Para que cada amigo marque su propio chulo desde su teléfono y todos vean los cambios
al instante. Cada chulo será una fila independiente (sin pisarse). Los amigos solo
abren el link; no necesitan cuenta. Ver `CLAUDE.md` › "Sincronización en vivo".
