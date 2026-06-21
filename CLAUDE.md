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
  - `app.js` — Capa de UI: render de las vistas **Total** (tabla tipo Excel), **Yo**
    (hoja personal: se filtra una persona y marca solo lo suyo) y **Recuerdos**
    (galería slideshow de fotos), tema único Noche. Delegación de eventos en `#app`.
    Redibuja en `cuentas:changed` y `cuentas:remote-applied` preservando foco/cursor **y
    el scroll de la matriz**. Agregar/editar gasto = **modal** (vive fuera de `#app` para
    sobrevivir a los re-render). **Confirmar** = chulo azul por persona; **imagen** de
    "para quedar en paz" dibujada en `<canvas>` (sin librerías; en compu descarga, en
    celular comparte). El toggle Compartir baja a la fila de Total/Yo en celular
    (clase `.header-controls` + media query). El título del paseo avisa al sync por
    `cuentas:field`. Estilos inline 1:1 del handoff.
  - `sync.js` — Sincronización en vivo con Supabase: carga inicial (+siembra si vacío),
    suscripción realtime → re-fetch → `replaceState` silencioso, y traducción de cada
    acción a su escritura (chulo = una fila). Maneja también `memories` y el **Storage**
    de fotos (`window.CuentasSync.uploadPhoto/deletePhoto`). Pastilla de estado abajo-izq.
  - `supabase-config.js` — `url` + `anonKey` (públicos por diseño; la seguridad la da RLS).
- `supabase/schema.sql` — Tablas (`people` con `confirmed`, `expenses`, `participations`,
  `trip_meta`, `memories`), RLS de link abierto, `realtime` y el **bucket de Storage
  `recuerdos`** con sus políticas. Pegar en el SQL Editor de Supabase.
- `.github/workflows/deploy.yml` — Publica `src/` en GitHub Pages en cada push a `main`.
- `netlify.toml` — Config alternativa (publish=`src`) por si se quiere usar Netlify.
- `package.json` — Metadatos + script `dev`. Supabase se carga por CDN (sin npm).
- `active/` — Scratch / memoria de trabajo (gitignored). Contiene el handoff de diseño original.

## Modelo de datos (estado en localStorage, clave `cuentas_paseo_v3`)
```
{
  tripName: string,                 // título editable del paseo (default 'Drumcode')
  theme: 'noche'|'limpio'|'calido', // tema visual
  view: 'tabla'|'yo'|'recuerdos',   // 'tabla'=Total · 'yo'=hoja personal · 'recuerdos'=galería (Total es siempre el landing)
  newPerson: string,                // buffer del input "agregar persona"
  people:   [{ id, name, confirmed:boolean }], // confirmed = la persona dio su OK (chulo azul)
  expenses: [{ id, concepto, dia, valor:number, payerId, notes, parts:[personId,...] }], // orden del arreglo = orden visible (col `position`, arrastrable); notes = detalles (💬)
  memories: [{ id, url, path, caption }] // fotos del paseo (archivo en Storage; url+ruta+caption)
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
- Tema único **Noche** (set de variables CSS en el contenedor raíz). `THEMES` aún
  define limpio/cálido en `core.js` por si se quiere reactivar el selector.
- Compartir: `navigator.share()` → WhatsApp (`wa.me`) → portapapeles (fallback).
- Re-render completo en cada cambio con restauración de foco/cursor; los inputs de
  texto (concepto, día, nombre, título) actualizan el estado **sin** redibujar para
  no estorbar al escribir; el **valor** sí redibuja porque afecta los cálculos.

## Sincronización en vivo (Supabase — IMPLEMENTADO)
Cada amigo abre el link y marca SUS propios chulos; todos ven los cambios al instante.
**Por qué Supabase y no Netlify Blobs**: el problema de sobreescritura nace de guardar
todo el arreglo de una (last-write-wins). Con Supabase cada chulo es una **fila
independiente** `(expense_id, person_id)` → dos personas marcando casillas distintas
nunca se pisan, y `realtime` empuja los cambios a todos en vivo.
- **Acceso**: link abierto (RLS `using(true)`); **un** paseo compartido (todos editan el mismo).
- **Tablas**: `people`, `expenses`, `participations` (PK `expense_id+person_id` = el chulo),
  `trip_meta` (fila única con el nombre). IDs de **texto** generados por el cliente.
- **`sync.js`**: al abrir baja todo; si el servidor está vacío lo siembra con el ejemplo
  local. Realtime sobre todo el schema → re-fetch debounced → `replaceState` silencioso
  → redibuja. Ops estructurales = escritura inmediata; campos de texto = escritura
  debounced, pausando el re-fetch mientras se teclea (se vacía al salir del campo).
- Los amigos **no** tocan Supabase: solo abren el link. La *anon key* va en el frontend
  (pública por diseño); la seguridad la dan las políticas **RLS**.
- Proyecto Supabase: `xxtassbprolppqcejxml` (cuenta de Juan).

## Recuerdos (galería de fotos — Fase 1)
Tercera hoja al lado de Total/Yo: una **galería slideshow** del paseo ("cobro feliz",
para que no duela tanto pagar). Cada foto = una fila en `memories` + un archivo en el
**bucket de Storage `recuerdos`** (público; seguridad por RLS de link abierto, igual que el resto).
- **Subir** (`app.js`): se comprime y se corrige la orientación en el navegador antes de
  subir (verticales/pesadas → livianas y derechas). **HEIC** (iPhone) se convierte a JPEG
  con `heic2any` cargado **lazy** (solo cuando aparece un HEIC); el `accept` y el filtro
  aceptan `.heic/.heif` (en Windows llegan con MIME vacío). La red (Storage) vive en
  `sync.js` (`window.CuentasSync.uploadPhoto/deletePhoto`); la UI orquesta y llama `addMemory`.
- **Slideshow**: fade automático (~4.5s) manejado con **DOM directo** (opacidad), no por
  re-render, para no reconstruir todo cada tick. Se pausa con el mouse encima o al editar
  el caption. Flechas, miniaturas y contador. Borrar foto = borra fila + archivo de Storage.
- **Caption** editable por foto (para molestar): sincronizado **debounced** vía `cuentas:field`
  (`op:'memoryCaption'`), como el resto de textos.
- **Pendiente de Juan**: correr el `schema.sql` actualizado (tabla `memories` + bucket
  `recuerdos` + políticas) y subir las fotos. Sin eso, subir da error controlado (toast).

## Despliegue
- **En vivo**: https://jmsoul2.github.io/Paseos_Amigos/ (GitHub Pages, repo público
  `jmsoul2/Paseos_Amigos`). Workflow de Actions publica `src/` en cada push a `main`
  (Source = "GitHub Actions" + `enablement:true` en el workflow).
- Flujo de trabajo: iterar en local (`npm run dev` → http://localhost:5050) y hacer
  push solo cuando algo esté listo.
- Alternativa lista: Netlify (publish=`src`, ver `netlify.toml`). Sin funciones (el
  backend es Supabase), así que no consume build ni "créditos" relevantes.
- `index.html` usa rutas relativas → funciona bajo subpath (`/Paseos_Amigos/`).

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
- [x] Portar diseño + lógica del handoff a vanilla (Tabla, Tarjetas, saldos, transferencias, compartir).
- [x] Persistencia local (localStorage) + cálculos verificados con el ejemplo.
- [x] Subir a GitHub (`jmsoul2/Paseos_Amigos`) y activar GitHub Pages.
- [x] Tema único Noche.
- [x] Sincronización en vivo con Supabase (cada chulo = una fila; realtime). Probado OK.
- [x] Hoja **Yo** (dashboard personal filtrado por persona; Total siempre el landing).
- [x] Agregar/editar gasto por **modal** (sin edición directa en celdas); fix de scroll de la matriz.
- [x] **Confirmar** por persona (chulo azul, sincronizado) + **imagen** de "para quedar en paz" (canvas) al estar todos confirmados.
- [x] Fix imagen "para quedar en paz" en **computador** (descarga directa) + Compartir en la fila de Total/Yo en celular.
- [x] Hoja **Recuerdos** (galería slideshow + subir/borrar/caption + Storage). En prod y probado OK (subida con HEIC→JPEG; fix de FileList).
- [~] **Reordenar gastos** arrastrando (mouse / HTML5 DnD; columna `position`) + **detalles/notas** por gasto (col `notes`: textarea en el modal, 💬 en la matriz abre tarjeta de solo lectura, inline en hoja Yo). Código listo en local; **falta correr el SQL** (position + notes) y probar. (Arrastrar: en celular no aún.)
- [ ] Compartir el link con los amigos (probar en producción con gente real).
- [ ] (Opcional) Resetear confirmaciones automáticamente si cambian los números (hoy es manual).
- [ ] (Opcional) Pulir el descuadre de redondeo de ~3 pesos en transferencias.
- [ ] (Opcional) Links de pago (Nequi/Daviplata/Bre-B) junto a cada transferencia.
