/* ============================================================
   Cuentas del Paseo — sincronización en vivo (Supabase)
   ------------------------------------------------------------
   Modelo: cada acción escribe SU propia fila → dos personas marcando
   casillas distintas nunca se pisan. El realtime avisa a todos y cada
   cliente vuelve a leer el estado (re-fetch) y redibuja.

   - Carga inicial: baja el estado; si el servidor está vacío lo siembra
     con lo que haya local (el ejemplo).
   - Acciones estructurales (chulo, +/− persona/gasto, pagador) → escritura
     inmediata vía evento 'cuentas:changed'.
   - Campos de texto/número (nombre, concepto, día, valor) → escritura
     debounced vía evento 'cuentas:field'. Mientras se escribe, se PAUSAN
     los re-fetch para no pisar lo que el usuario teclea; al salir del campo
     se vacían los pendientes y se reconcilia.
   ============================================================ */
(function () {
  const cfg = window.SUPABASE_CONFIG;
  const C = window.Cuentas;
  if (!cfg || !cfg.url || /TU_|xxxx/.test(cfg.url) || !window.supabase) {
    console.warn('[sync] Supabase no configurado o librería ausente; la app corre solo en local.');
    return;
  }
  const sb = window.supabase.createClient(cfg.url, cfg.anonKey);

  let applying = false; // guard: estamos aplicando estado remoto

  /* ---------------- indicador de estado ---------------- */
  let dotEl, txtEl;
  const STATES = {
    sync:    { c: '#C39A52', t: 'Conectando…' },
    ok:      { c: '#65e6a1', t: 'En vivo' },
    offline: { c: '#ff7d7d', t: 'Sin conexión' },
  };
  function injectPill() {
    const pill = document.createElement('div');
    pill.style.cssText = [
      'position:fixed', 'z-index:60',
      'left:max(12px, env(safe-area-inset-left))',
      'bottom:calc(12px + env(safe-area-inset-bottom))',
      'display:inline-flex', 'align-items:center', 'gap:7px',
      'padding:6px 11px', 'border-radius:999px',
      'background:rgba(20,19,25,.92)', 'backdrop-filter:blur(6px)',
      'border:1px solid rgba(255,255,255,.12)', 'box-shadow:0 2px 10px rgba(0,0,0,.35)',
      "font:600 12px/1 'Space Grotesk',system-ui,sans-serif", 'color:#8c8b98',
    ].join(';');
    dotEl = document.createElement('span');
    dotEl.style.cssText = 'width:8px;height:8px;border-radius:999px;background:#8c8b98;flex:0 0 auto';
    txtEl = document.createElement('span');
    txtEl.textContent = '…';
    pill.append(dotEl, txtEl);
    document.body.appendChild(pill);
  }
  function setStatus(kind) {
    if (!dotEl) return;
    const s = STATES[kind] || STATES.ok;
    dotEl.style.background = s.c;
    txtEl.textContent = s.t;
  }

  /* ---------------- helpers de red ---------------- */
  const run = async (q) => { const { error } = await q; if (error) throw error; };

  async function fetchState() {
    const [pe, ex, pa, mt] = await Promise.all([
      sb.from('people').select('*').order('created_at'),
      sb.from('expenses').select('*').order('created_at'),
      sb.from('participations').select('*'),
      sb.from('trip_meta').select('*').eq('id', 1).maybeSingle(),
    ]);
    if (pe.error || ex.error || pa.error) throw (pe.error || ex.error || pa.error);
    const partsByExp = {};
    (pa.data || []).forEach(r => { (partsByExp[r.expense_id] = partsByExp[r.expense_id] || []).push(r.person_id); });
    const people = (pe.data || []).map(r => ({ id: r.id, name: r.name }));
    const expenses = (ex.data || []).map(r => ({
      id: r.id, concepto: r.concepto || '', dia: r.dia || '',
      valor: Number(r.valor) || 0, payerId: r.payer_id || '',
      parts: partsByExp[r.id] || [],
    }));
    const tripName = (mt && mt.data && mt.data.name) || 'Drumcode';
    return { people, expenses, tripName };
  }

  function applyRemote(remote) {
    const local = C.getState();
    applying = true;
    C.replaceState({
      tripName: remote.tripName,
      theme: 'noche',
      view: local.view,           // la vista es preferencia de cada dispositivo
      newPerson: local.newPerson, // buffer local
      people: remote.people,
      expenses: remote.expenses,
    }, true); // silent: no emite 'cuentas:changed' → no genera escritura
    applying = false;
    window.dispatchEvent(new CustomEvent('cuentas:remote-applied'));
  }

  /* ---------------- empujar TODO (sembrar / reset) ---------------- */
  async function pushAll(s) {
    await run(sb.from('participations').delete().neq('expense_id', ''));
    await run(sb.from('expenses').delete().neq('id', ''));
    await run(sb.from('people').delete().neq('id', ''));
    if (s.people.length) {
      await run(sb.from('people').upsert(s.people.map(p => ({ id: p.id, name: p.name }))));
    }
    if (s.expenses.length) {
      await run(sb.from('expenses').upsert(s.expenses.map(e => ({
        id: e.id, concepto: e.concepto || '', dia: e.dia || '',
        valor: e.valor || 0, payer_id: e.payerId || null,
      }))));
    }
    const partRows = [];
    s.expenses.forEach(e => (e.parts || []).forEach(pid => partRows.push({ expense_id: e.id, person_id: pid })));
    if (partRows.length) await run(sb.from('participations').upsert(partRows));
    await run(sb.from('trip_meta').upsert({ id: 1, name: s.tripName || 'Drumcode' }));
  }

  /* ---------------- re-fetch (con pausa si se está escribiendo) ---------------- */
  const editableId = id => id === 'trip-name' || id === 'new-person' || /^[cdv]-/.test(id);
  function isEditingText() {
    const a = document.activeElement;
    return !!(a && a.id && editableId(a.id));
  }
  let refetchTimer = null;
  function scheduleRefetch() {
    clearTimeout(refetchTimer);
    refetchTimer = setTimeout(doRefetch, 180);
  }
  async function doRefetch() {
    if (isEditingText()) { scheduleRefetch(); return; } // diferir mientras se teclea
    try { applyRemote(await fetchState()); setStatus('ok'); }
    catch (e) { console.error('[sync] refetch', e); setStatus('offline'); }
  }

  /* ---------------- escrituras inmediatas (ops estructurales) ---------------- */
  window.addEventListener('cuentas:changed', (e) => {
    if (applying) return;
    handleOp(e.detail || {}).catch(err => { console.error('[sync] write', err); setStatus('offline'); });
  });

  async function handleOp(d) {
    const s = C.getState();
    switch (d.op) {
      case 'addPerson': {
        await run(sb.from('people').insert({ id: d.id, name: d.name }));
        const rows = s.expenses.map(x => ({ expense_id: x.id, person_id: d.id }));
        if (rows.length) await run(sb.from('participations').upsert(rows));
        break;
      }
      case 'removePerson':
        await run(sb.from('people').delete().eq('id', d.id)); // cascada borra chulos; pagador → null
        break;
      case 'addExpense': {
        const ex = s.expenses.find(x => x.id === d.id) || {};
        await run(sb.from('expenses').insert({
          id: d.id, concepto: ex.concepto || '', dia: ex.dia || '',
          valor: ex.valor || 0, payer_id: ex.payerId || null,
        }));
        const rows = (ex.parts || []).map(pid => ({ expense_id: d.id, person_id: pid }));
        if (rows.length) await run(sb.from('participations').upsert(rows));
        break;
      }
      case 'removeExpense':
        await run(sb.from('expenses').delete().eq('id', d.id)); // cascada borra chulos
        break;
      case 'updateExpense': { // por aquí solo llega el pagador (el texto va por 'cuentas:field')
        const p = d.patch || {};
        if ('payerId' in p) await run(sb.from('expenses').update({ payer_id: p.payerId || null }).eq('id', d.id));
        break;
      }
      case 'toggleParticipation':
        if (d.on) await run(sb.from('participations').upsert({ expense_id: d.expId, person_id: d.personId }));
        else await run(sb.from('participations').delete().eq('expense_id', d.expId).eq('person_id', d.personId));
        break;
      case 'setParts':
        await run(sb.from('participations').delete().eq('expense_id', d.expId));
        if ((d.parts || []).length) {
          await run(sb.from('participations').insert(d.parts.map(pid => ({ expense_id: d.expId, person_id: pid }))));
        }
        break;
      case 'reset':
        await pushAll(C.getState());
        break;
      default:
        break;
    }
  }

  /* ---------------- escrituras debounced (campos de texto) ---------------- */
  const pending = new Map(); // key -> { timer, fn }
  function debounceWrite(key, fn, delay) {
    const ex = pending.get(key);
    if (ex) clearTimeout(ex.timer);
    const timer = setTimeout(() => { pending.delete(key); fn().catch(err => { console.error('[sync] field', err); setStatus('offline'); }); }, delay || 600);
    pending.set(key, { timer, fn });
  }
  async function flushPending() {
    const items = [...pending.values()];
    pending.clear();
    items.forEach(it => clearTimeout(it.timer));
    await Promise.all(items.map(it => it.fn().catch(err => console.error('[sync] flush', err))));
  }
  window.addEventListener('cuentas:field', (e) => {
    const d = e.detail || {};
    if (d.op === 'tripName') {
      debounceWrite('tripName', () => run(sb.from('trip_meta').upsert({ id: 1, name: d.value })));
    } else if (d.op === 'updateExpense') {
      const p = d.patch || {};
      const patch = {};
      if ('concepto' in p) patch.concepto = p.concepto;
      if ('dia' in p) patch.dia = p.dia;
      if ('valor' in p) patch.valor = p.valor;
      if (!Object.keys(patch).length) return;
      debounceWrite('exp:' + d.id + ':' + Object.keys(patch).join(','), () => run(sb.from('expenses').update(patch).eq('id', d.id)));
    }
  });
  // Al salir de un campo: vaciar pendientes y reconciliar con el servidor.
  document.addEventListener('focusout', (e) => {
    const t = e.target;
    if (t && t.id && editableId(t.id)) flushPending().then(scheduleRefetch);
  });

  /* ---------------- arranque ---------------- */
  function subscribe() {
    sb.channel('paseo-realtime')
      .on('postgres_changes', { event: '*', schema: 'public' }, scheduleRefetch)
      .subscribe((status) => { if (status === 'SUBSCRIBED') setStatus('ok'); });
  }
  async function boot() {
    injectPill();
    setStatus('sync');
    try {
      const remote = await fetchState();
      const serverEmpty = remote.people.length === 0 && remote.expenses.length === 0;
      const local = C.getState();
      const localHasData = local.people.length > 0 || local.expenses.length > 0;
      if (serverEmpty && localHasData) {
        await pushAll(local);       // primera vez: sembrar el servidor con el ejemplo
      } else {
        applyRemote(remote);        // el servidor manda
      }
      setStatus('ok');
    } catch (e) {
      console.error('[sync] boot', e);
      setStatus('offline');
    }
    subscribe();
  }

  window.addEventListener('online', scheduleRefetch);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) scheduleRefetch(); });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // Utilidades de consola
  window.VidaSync = { refetch: scheduleRefetch, pushAll: () => pushAll(C.getState()) };
})();
