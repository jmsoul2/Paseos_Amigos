# Cuentas del Paseo

## Descripción del Proyecto
Web app para dividir gastos de un paseo entre amigos. La pantalla estrella es una
**matriz tipo Excel**: gastos en filas, personas en columnas, y cada celda es un
chulo (✓) que marca si esa persona participó en ese gasto. Calcula en vivo los
**saldos** (quién puso de más / de menos) y el **mínimo de transferencias** para
"quedar en paz". La idea de Juan: compartir un link y que **cada amigo marque su
propio chulo** desde su teléfono, para que todos queden tranquilos y paguen lo justo.

## Tipo de Proyecto
Web app **vanilla** (HTML/CSS/JS, sin build). Fuentes por Google Fonts (CDN). El
backend de sincronización en vivo será **Supabase** (pendiente, ver Fase 2). Sitio
100% estático → se puede alojar en cualquier lado.

## Cómo correrla
Abrir `src/index.html` en el navegador (funciona con `file://`). Para servirla:
`npm run dev` (= `npx serve src`) o Live Server.

## Estructura de Carpetas
- `src/` — Código de la app (esto es lo que se publica)
  - `index.html` — Entrada: fuentes, `<datalist>` de días, contenedor `#app`, carga de scripts.
  - `core.js` — Capa de datos (`window.Cuentas`): estado, persistencia en `localStorage`,
    cálculos puros (`computeNets`, `computeOwed`, `computeTransfers`, `buildSummary`),
    temas (`THEMES`), datos de ejemplo, y **API de mutaciones granular**. Cada mutación
    guarda y emite `cuentas:changed` con `{ op, ... }`.
  - `app.js` — Capa de UI: render de las vistas **Tabla** y **Tarjetas**, temas, y
    delegación de eventos en `#app`. Redibuja en cada `cuentas:changed` preservando
    foco/cursor. Estilos inline portados 1:1 del handoff (alta fidelidad).
- `.github/workflows/deploy.yml` — Publica `src/` en GitHub Pages en cada push a `main`.
- `netlify.toml` — Config alternativa (publish=`src`) por si se quiere usar Netlify.
- `package.json` — Metadatos + script `dev`. Sin dependencias (Supabase irá por CDN).
- `active/` — Scratch / memoria de trabajo (gitignored). Contiene el handoff de diseño original.

## Modelo de datos (estado en localStorage, clave `cuentas_paseo_v3`)
```
{
  tripName: string,                 // título editable del paseo (default 'Drumcode')
  theme: 'noche'|'limpio'|'calido', // tema visual
  view: 'tabla'|'cards',            // vista activa
  newPerson: string,                // buffer del input "agregar persona"
  people:   [{ id, name }],
  expenses: [{ id, concepto, dia, valor:number, payerId, parts:[personId,...] }]
}
```
- **El chulo de una persona en un gasto = su `id` dentro de `expense.parts`.** Esta es
  la unidad atómica (futura fila en Supabase): `toggleParticipation(expId, personId)`.
- **Saldo neto** de una persona = (lo que pagó) − (suma de sus partes por cabeza).
  Parte por cabeza = `valor / nº participantes`. Redondeado a pesos enteros.
- **Transferencias** = greedy min-cash-flow (mayor deudor ↔ mayor acreedor).
- Verificado con los datos del ejemplo (Excel del cliente): total $1.650.152, 19
  personas, JuanMa el gran acreedor. Hay un descuadre cosmético de ~3 pesos por
  redondeo entre personas (idéntico al prototipo, despreciable).

## Cálculo y UX (decisiones)
- Moneda: COP sin decimales, separador de miles `.`, prefijo `$`
  (`Intl.NumberFormat('es-CO')`). Saldos negativos con el signo menos U+2212 (−).
- 3 temas (Noche/Limpio/Cálido) = sets de variables CSS en el contenedor raíz.
- Compartir: `navigator.share()` → WhatsApp (`wa.me`) → portapapeles (fallback).
- Re-render completo en cada cambio con restauración de foco/cursor; los inputs de
  texto (concepto, día, nombre, título) actualizan el estado **sin** redibujar para
  no estorbar al escribir; el **valor** sí redibuja porque afecta los cálculos.

## Sincronización en vivo (Fase 2 — Supabase, PENDIENTE)
Objetivo: cada amigo abre el link y marca SUS propios chulos; todos ven los cambios
al instante. **Por qué Supabase y no Netlify Blobs**: el problema de sobreescritura
nace de guardar todo el arreglo de una (last-write-wins). Con Supabase cada chulo es
una **fila independiente** `(expense_id, person_id)` → dos personas marcando casillas
distintas nunca se pisan, y `realtime` empuja los cambios a todos en vivo.
- Los amigos **no** tocan Supabase: abren el link de Pages y listo (sin cuenta/login).
- Solo Juan crea **una** cuenta gratis de Supabase (una vez).
- La *anon key* va en el frontend (es pública por diseño); la seguridad la dan las
  políticas **RLS**, no esconder la llave. Configurar RLS con cuidado al conectar.
- Modelo de tablas previsto: `trips`, `people`, `expenses`, `participations`
  (PK compuesta expense_id+person_id = el chulo). `core.js` ya expone una API de
  mutaciones granular que mapea 1:1 a estas escrituras.

## Despliegue
- **Host elegido**: GitHub Pages (repo público `cuentas-paseo`). Workflow de Actions
  publica `src/` en cada push a `main`. Activar en Settings › Pages › Source: GitHub Actions.
- Alternativa lista: Netlify (publish=`src`, ver `netlify.toml`). Sin funciones (el
  backend es Supabase), así que no consume build ni "créditos" relevantes.
- `index.html` usa rutas relativas → funciona bajo subpath (`usuario.github.io/cuentas-paseo/`).

## Origen
Diseñado en Claude Design y exportado como handoff bundle (`active/temp/`). El
prototipo (`Cuentas del Paseo.dc.html`) trae el diseño hifi + la lógica; se portó a
vanilla. Datos de ejemplo = el Excel real del cliente (19 personas, 4 gastos).

## Convenciones
- `.env` nunca va a git. La config de Supabase (URL + anon key) NO es secreta, pero
  la seguridad real está en RLS.
- Mantener el código de la app dentro de `src/`.
- Actualizar este CLAUDE.md a medida que el proyecto evoluciona.

## Objetivos Actuales
- [x] Portar diseño + lógica del handoff a vanilla (Tabla, Tarjetas, 3 temas, saldos, transferencias, compartir).
- [x] Persistencia local (localStorage) + cálculos verificados con el ejemplo.
- [ ] Subir a GitHub (repo público `cuentas-paseo`) y activar GitHub Pages.
- [ ] Fase 2: sincronización en vivo con Supabase (cada chulo = una fila; realtime).
- [ ] Compartir el link con los amigos.
- [ ] (Opcional) Pulir el descuadre de redondeo de ~3 pesos en transferencias.
- [ ] (Opcional) Links de pago (Nequi/Daviplata/Bre-B) junto a cada transferencia.
