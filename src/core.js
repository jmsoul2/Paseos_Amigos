/* ============================================================
   Cuentas del Paseo — capa de datos y lógica (window.Cuentas)
   ------------------------------------------------------------
   - Fuente de verdad del estado + cálculos puros (saldos, transferencias).
   - Persistencia local en localStorage (caché instantánea).
   - API de mutaciones GRANULAR: cada acción es una operación pequeña
     (toggle de un chulo, agregar persona, etc.). Esto es a propósito:
     cuando entre la sincronización en vivo (Supabase), cada operación
     mapea a UNA fila/escritura independiente y nunca se pisan entre sí.
   - Toda mutación guarda y emite el evento 'cuentas:changed' con detalle
     { op, ... } para que la UI redibuje y, más adelante, el sync empuje.
   ============================================================ */
(function () {
  const KEY = 'cuentas_paseo_v3';

  /* ---------------- temas (tokens CSS) ---------------- */
  const THEMES = {
    noche: {
      '--bg': '#0a0a0c', '--panel': '#141319', '--inset': '#1d1c25',
      '--fg': '#f4f4f6', '--muted': '#8c8b98', '--line': 'rgba(255,255,255,0.09)',
      '--accent': '#c2f24a', '--accent-fg': '#0a0a0c', '--pos': '#65e6a1', '--neg': '#ff7d7d', '--confirm': '#4d9bff',
      '--font-head': "'Space Grotesk',sans-serif", '--font-body': "'Space Grotesk',sans-serif",
      '--font-num': "'Space Mono',monospace",
    },
    limpio: {
      '--bg': '#f3f4f7', '--panel': '#ffffff', '--inset': '#f1f3f6',
      '--fg': '#15171d', '--muted': '#717684', '--line': 'rgba(20,23,29,0.10)',
      '--accent': '#4f46e5', '--accent-fg': '#ffffff', '--pos': '#0e9f6e', '--neg': '#e5484d', '--confirm': '#2563eb',
      '--font-head': "'Plus Jakarta Sans',sans-serif", '--font-body': "'Plus Jakarta Sans',sans-serif",
      '--font-num': "'Space Mono',monospace",
    },
    calido: {
      '--bg': '#f1e9dc', '--panel': '#fbf6ee', '--inset': '#efe5d5',
      '--fg': '#2c2419', '--muted': '#8d7d68', '--line': 'rgba(70,48,22,0.14)',
      '--accent': '#c4632d', '--accent-fg': '#fbf6ee', '--pos': '#4e7a3f', '--neg': '#b5482f', '--confirm': '#2f6db0',
      '--font-head': "'Newsreader',serif", '--font-body': "'Plus Jakarta Sans',sans-serif",
      '--font-num': "'Space Mono',monospace",
    },
  };

  /* ---------------- estado ---------------- */
  let state = load() || freshState();
  state.view = 'tabla'; // el Total es siempre el landing (en todos los dispositivos)
  if (!state.theme) state.theme = 'noche';

  function freshState() {
    // Primera vez: arranca con el ejemplo (datos reales del Excel del cliente).
    return Object.assign(
      { tripName: 'Drumcode', theme: 'noche', view: 'tabla', newPerson: '', people: [], expenses: [] },
      example()
    );
  }

  function example() {
    const names = ['JuanMa', 'Susy C', 'Peralta', 'Susy S', 'Juan D', 'Santi', 'Andre', 'Punti',
      'Ayala', 'Mono', 'Dani', 'Cata', 'Lucas', 'Gordi', 'Ed', 'Will', 'Ana', 'Pipe', 'Juanpa'];
    const people = names.map((n, i) => ({ id: 'p' + i, name: n }));
    const id = n => people.find(p => p.name === n).id;
    const all = people.map(p => p.id);
    const drumcode = ['Susy C', 'Andre', 'Punti', 'Ayala', 'Mono', 'Dani', 'Cata', 'Lucas', 'Santi', 'Gordi'].map(id);
    const expenses = [
      { id: 'e0', concepto: 'Van', dia: 'Viernes', valor: 450000, payerId: id('JuanMa'), parts: [...all] },
      { id: 'e1', concepto: 'Drumcode, tequila + aguas', dia: 'Viernes', valor: 906852, payerId: id('JuanMa'), parts: drumcode },
      { id: 'e2', concepto: 'Cervezas Mono', dia: 'Sábado', valor: 80000, payerId: id('Mono'), parts: [...all] },
      { id: 'e3', concepto: 'Cervezas / Sodas Ayala', dia: 'Sábado', valor: 213300, payerId: id('Ayala'), parts: [...all] },
    ];
    return { people, expenses };
  }

  /* ---------------- persistencia ---------------- */
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && Array.isArray(s.people)) return s;
    } catch (e) {}
    return null;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  /* ---------------- utilidades ---------------- */
  const nf = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
  // Moneda COP: sin decimales, separador de miles ".", prefijo "$".
  function fmt(n) { return '$' + nf.format(Math.round(Number(n) || 0)); }
  function initials(name) {
    const parts = String(name).trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  function uid(p) { return p + Math.random().toString(36).slice(2, 8); }

  /* ---------------- cálculos puros ---------------- */
  // Neto por persona = (lo que pagó) − (su parte por cabeza en los gastos en que participó).
  function computeNets(people, expenses) {
    const net = {}; people.forEach(p => net[p.id] = 0);
    for (const e of expenses) {
      const v = Number(e.valor) || 0;
      const parts = (e.parts || []).filter(pid => Object.prototype.hasOwnProperty.call(net, pid));
      if (e.payerId && Object.prototype.hasOwnProperty.call(net, e.payerId)) net[e.payerId] += v;
      if (parts.length > 0) { const share = v / parts.length; parts.forEach(pid => net[pid] -= share); }
    }
    people.forEach(p => net[p.id] = Math.round(net[p.id]));
    return net;
  }

  // "Le toca a c/u": suma de las partes por cabeza de cada persona (sin restar lo que pagó).
  function computeOwed(people, expenses) {
    const owe = {}; people.forEach(p => owe[p.id] = 0);
    for (const e of expenses) {
      const parts = (e.parts || []).filter(pid => people.some(p => p.id === pid));
      if (parts.length > 0) { const sh = (Number(e.valor) || 0) / parts.length; parts.forEach(pid => owe[pid] += sh); }
    }
    return owe;
  }

  // Mínimo de transferencias (greedy min-cash-flow): empareja el mayor deudor con el mayor acreedor.
  function computeTransfers(people, net) {
    const name = id => (people.find(p => p.id === id) || {}).name || '';
    const creditors = people.filter(p => net[p.id] > 0).map(p => ({ name: name(p.id), amt: net[p.id] })).sort((a, b) => b.amt - a.amt);
    const debtors = people.filter(p => net[p.id] < 0).map(p => ({ name: name(p.id), amt: -net[p.id] })).sort((a, b) => b.amt - a.amt);
    const res = []; let i = 0, j = 0, guard = 0;
    while (i < debtors.length && j < creditors.length && guard++ < 9999) {
      const pay = Math.min(debtors[i].amt, creditors[j].amt);
      if (pay > 0) res.push({ from: debtors[i].name, to: creditors[j].name, amount: pay });
      debtors[i].amt -= pay; creditors[j].amt -= pay;
      if (debtors[i].amt <= 0) i++;
      if (creditors[j].amt <= 0) j++;
    }
    return res;
  }

  // Texto para el botón Compartir (WhatsApp / navigator.share).
  function buildSummary() {
    const { tripName, people, expenses } = state;
    const net = computeNets(people, expenses);
    const transfers = computeTransfers(people, net);
    const total = expenses.reduce((a, e) => a + (Number(e.valor) || 0), 0);
    let s = '💸 Cuentas del paseo — ' + (tripName || '') + '\n';
    s += 'Total: ' + fmt(total) + '  ·  ' + people.length + ' personas\n\n';
    s += 'Para quedar en paz:\n';
    if (transfers.length === 0) {
      s += (expenses.length === 0 ? '(sin gastos aún)' : '¡Todo saldado! 🎉') + '\n';
    } else {
      transfers.forEach(t => s += '• ' + t.from + ' → ' + t.to + ': ' + fmt(t.amount) + '\n');
    }
    return s;
  }

  /* ---------------- mutaciones (cada una guarda + emite) ---------------- */
  function emit(op, detail) {
    save();
    window.dispatchEvent(new CustomEvent('cuentas:changed', { detail: Object.assign({ op }, detail) }));
  }

  // Mutación "interna": aplica cambios silenciosos (p. ej. al recibir del servidor).
  // Si silent=true no emite (la usará el sync para no rebotar).
  const M = {
    setTripName(v, silent) { state.tripName = v; silent ? save() : emit('tripName', { value: v }); },
    setTheme(v, silent) { state.theme = v; silent ? save() : emit('theme', { value: v }); },
    setView(v, silent) { state.view = v; silent ? save() : emit('view', { value: v }); },
    setNewPerson(v) { state.newPerson = v; save(); /* buffer de UI: no necesita redibujar */ },

    addPerson(name) {
      name = (name != null ? name : state.newPerson || '').trim();
      if (!name) return null;
      const id = uid('p');
      state.people.push({ id, name, confirmed: false });
      // Por defecto, una persona nueva entra en TODOS los gastos existentes.
      state.expenses.forEach(e => { if (!e.parts.includes(id)) e.parts.push(id); });
      state.newPerson = '';
      emit('addPerson', { id, name });
      return id;
    },
    removePerson(id) {
      state.people = state.people.filter(p => p.id !== id);
      state.expenses.forEach(e => {
        e.parts = e.parts.filter(x => x !== id);
        if (e.payerId === id) e.payerId = '';
      });
      emit('removePerson', { id });
    },
    // Confirmación personal: "revisé mis gastos y quedo listo". Estado compartido.
    toggleConfirm(id) {
      const p = state.people.find(x => x.id === id);
      if (!p) return;
      p.confirmed = !p.confirmed;
      emit('confirm', { id, on: p.confirmed });
    },

    addExpense(fields) {
      const id = uid('e');
      // Defaults + lo que venga del formulario (concepto/día/valor/pagador).
      // parts arranca con TODOS (mismo criterio que addPerson); luego se ajusta con chulos.
      const exp = Object.assign({
        concepto: '', dia: '', valor: 0,
        payerId: (state.people[0] && state.people[0].id) || '',
        parts: state.people.map(p => p.id),
      }, fields || {}, { id });
      state.expenses.push(exp);
      emit('addExpense', { id });
      return id;
    },
    updateExpense(id, patch, silent) {
      const e = state.expenses.find(x => x.id === id);
      if (!e) return;
      Object.assign(e, patch);
      silent ? save() : emit('updateExpense', { id, patch });
    },
    removeExpense(id) {
      state.expenses = state.expenses.filter(e => e.id !== id);
      emit('removeExpense', { id });
    },

    // EL chulo: operación atómica e independiente (futura fila en Supabase).
    toggleParticipation(expId, personId) {
      const e = state.expenses.find(x => x.id === expId);
      if (!e) return;
      const has = e.parts.includes(personId);
      e.parts = has ? e.parts.filter(x => x !== personId) : [...e.parts, personId];
      emit('toggleParticipation', { expId, personId, on: !has });
    },
    setAll(expId) {
      const e = state.expenses.find(x => x.id === expId);
      if (!e) return;
      e.parts = state.people.map(p => p.id);
      emit('setParts', { expId, parts: e.parts });
    },
    setNone(expId) {
      const e = state.expenses.find(x => x.id === expId);
      if (!e) return;
      e.parts = [];
      emit('setParts', { expId, parts: [] });
    },

    loadExample() { Object.assign(state, { newPerson: '' }, example()); emit('reset', {}); },
    clearAll() { state.people = []; state.expenses = []; state.newPerson = ''; emit('reset', {}); },

    // Reemplazo total del estado (lo usará el sync al bajar del servidor).
    replaceState(next, silent) {
      state = Object.assign(freshStateShell(), next);
      if (!state.view) state.view = 'tabla';
      if (!state.theme) state.theme = 'noche';
      silent ? save() : emit('replace', {});
    },
  };

  function freshStateShell() {
    return { tripName: '', theme: 'noche', view: 'tabla', newPerson: '', people: [], expenses: [] };
  }

  /* ---------------- API pública ---------------- */
  window.Cuentas = {
    THEMES,
    getState: () => state,
    fmt, initials, uid,
    computeNets, computeOwed, computeTransfers, buildSummary,
    example,
    // mutaciones
    setTripName: M.setTripName, setTheme: M.setTheme, setView: M.setView, setNewPerson: M.setNewPerson,
    addPerson: M.addPerson, removePerson: M.removePerson, toggleConfirm: M.toggleConfirm,
    addExpense: M.addExpense, updateExpense: M.updateExpense, removeExpense: M.removeExpense,
    toggleParticipation: M.toggleParticipation, setAll: M.setAll, setNone: M.setNone,
    loadExample: M.loadExample, clearAll: M.clearAll, replaceState: M.replaceState,
  };
})();
