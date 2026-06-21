/* ============================================================
   Cuentas del Paseo — capa de UI (render + eventos)
   ------------------------------------------------------------
   - Lee el estado de window.Cuentas y llama sus mutaciones.
   - Redibuja todo el contenedor en cada cambio ('cuentas:changed'),
     preservando foco y cursor para no estorbar al escribir.
   - Estilos inline portados 1:1 del handoff de diseño (alta fidelidad).
   ============================================================ */
(function () {
  const C = window.Cuentas;
  const root = document.getElementById('app');

  /* ---------- helpers ---------- */
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ESC[c]);
  const fmt = C.fmt;

  /* ---------- toggles de cabecera ---------- */
  function viewToggle(view) {
    const btns = [['tabla', 'Tabla'], ['cards', 'Tarjetas']];
    return '<div style="display:flex;gap:6px;background:var(--panel);border:1px solid var(--line);border-radius:999px;padding:5px">' +
      btns.map(([k, l]) =>
        '<button data-act="view" data-view="' + k + '" style="border:none;cursor:pointer;border-radius:999px;padding:8px 16px;font-weight:600;font-size:13px;background:' +
        (view === k ? 'var(--accent)' : 'transparent') + ';color:' + (view === k ? 'var(--accent-fg)' : 'var(--muted)') +
        ';transition:all .2s">' + l + '</button>').join('') +
      '</div>';
  }
  // (Selector de tema retirado: la app usa solo el tema "Noche".)
  function header(s) {
    const btn = 'cursor:pointer;border:1px solid var(--line);background:var(--panel);color:var(--muted);border-radius:9px;padding:7px 13px;font-size:12.5px;font-weight:500';
    return '' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px;flex-wrap:wrap;margin-bottom:22px">' +
        '<div style="min-width:260px">' +
          '<div style="font-family:var(--font-num);font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:var(--accent);margin-bottom:8px">Cuentas del paseo</div>' +
          '<input id="trip-name" data-act="tripName" value="' + esc(s.tripName) + '" placeholder="Nombre del paseo" style="font-family:var(--font-head);font-weight:700;font-size:34px;line-height:1.05;letter-spacing:-0.02em;color:var(--fg);background:transparent;border:none;outline:none;width:100%;padding:0" />' +
          '<div style="color:var(--muted);font-size:14px;margin-top:6px">Cada uno pone su chulo en la fila del gasto. Se calcula solo quién debe a quién.</div>' +
        '</div>' +
        '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:10px">' +
          viewToggle(s.view) +
          '<div style="display:flex;gap:8px">' +
            '<button data-act="share" style="cursor:pointer;border:none;background:var(--accent);color:var(--accent-fg);border-radius:9px;padding:7px 15px;font-size:12.5px;font-weight:700">Compartir</button>' +
            '<button data-act="load" style="' + btn + '">Cargar ejemplo</button>' +
            '<button data-act="clear" style="' + btn + '">Vaciar</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  /* ---------- banda de stats ---------- */
  function statsBand(total, people, expenses) {
    const card = (label, value, flex) =>
      '<div style="flex:' + flex + ';background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:18px 20px">' +
        '<div style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:7px">' + label + '</div>' +
        '<div style="font-family:var(--font-num);font-weight:700;font-size:28px;letter-spacing:-0.01em">' + value + '</div>' +
      '</div>';
    const avg = people.length > 0 ? fmt(total / people.length) : '—';
    const accent =
      '<div style="flex:1 1 200px;background:var(--accent);color:var(--accent-fg);border-radius:16px;padding:18px 20px">' +
        '<div style="font-size:12px;opacity:.7;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:7px">Por cabeza (promedio)</div>' +
        '<div style="font-family:var(--font-num);font-weight:700;font-size:28px;letter-spacing:-0.01em">' + avg + '</div>' +
      '</div>';
    return '<div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:22px">' +
      card('Total del paseo', fmt(total), '1 1 200px') +
      card('Personas', people.length, '1 1 130px') +
      card('Gastos', expenses.length, '1 1 130px') +
      accent +
    '</div>';
  }

  /* ---------- saldos / transferencias (compartido) ---------- */
  function balanceData(b) {
    const zero = Math.abs(b.net) < 1;
    return {
      name: b.name, initials: C.initials(b.name),
      amountFmt: zero ? fmt(0) : (b.net > 0 ? '+' : '−') + fmt(Math.abs(b.net)),
      color: zero ? 'var(--muted)' : (b.net > 0 ? 'var(--pos)' : 'var(--neg)'),
      label: zero ? 'en paz' : (b.net > 0 ? 'le deben' : 'debe'),
    };
  }
  function avatar(initials, size) {
    return '<div style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:var(--inset);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:' +
      (size >= 30 ? 12 : 11) + 'px;font-weight:700;flex:none;color:var(--muted)">' + esc(initials) + '</div>';
  }
  function balanceGridItem(b) {
    const d = balanceData(b);
    return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;background:var(--inset);border:1px solid var(--line);border-radius:12px;padding:9px 12px">' +
      '<div style="display:flex;align-items:center;gap:9px;min-width:0">' +
        '<div style="width:28px;height:28px;border-radius:50%;background:var(--panel);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex:none;color:var(--muted)">' + esc(d.initials) + '</div>' +
        '<div style="min-width:0">' +
          '<div style="font-weight:600;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(d.name) + '</div>' +
          '<div style="font-size:11px;color:var(--muted)">' + d.label + '</div>' +
        '</div>' +
      '</div>' +
      '<div style="font-family:var(--font-num);font-weight:700;font-size:13px;white-space:nowrap;color:' + d.color + '">' + d.amountFmt + '</div>' +
    '</div>';
  }
  function balanceListRow(b) {
    const d = balanceData(b);
    return '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid var(--line)">' +
      '<div style="display:flex;align-items:center;gap:11px;min-width:0">' +
        avatar(d.initials, 30) +
        '<div style="min-width:0">' +
          '<div style="font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(d.name) + '</div>' +
          '<div style="font-size:11.5px;color:var(--muted)">' + d.label + '</div>' +
        '</div>' +
      '</div>' +
      '<div style="font-family:var(--font-num);font-weight:700;font-size:14.5px;text-align:right;white-space:nowrap;color:' + d.color + '">' + d.amountFmt + '</div>' +
    '</div>';
  }
  function transferRow(t) {
    return '<div style="display:flex;align-items:center;gap:9px;background:var(--inset);border:1px solid var(--line);border-radius:12px;padding:11px 13px">' +
      '<span style="font-weight:600;font-size:13.5px">' + esc(t.from) + '</span>' +
      '<span style="color:var(--accent);font-size:15px">→</span>' +
      '<span style="font-weight:600;font-size:13.5px">' + esc(t.to) + '</span>' +
      '<span style="margin-left:auto;font-family:var(--font-num);font-weight:700;font-size:14px;color:var(--accent)">' + fmt(t.amount) + '</span>' +
    '</div>';
  }
  function transfersBody(transfers, expenses) {
    if (transfers.length > 0) {
      return '<div style="display:flex;flex-direction:column;gap:9px">' + transfers.map(transferRow).join('') + '</div>';
    }
    const msg = expenses.length === 0 ? 'Agrega gastos para ver el cálculo.' : '¡Todo saldado! Nadie debe nada.';
    return '<div style="text-align:center;color:var(--muted);font-size:13.5px;padding:14px 0">' + msg + '</div>';
  }

  /* ---------- vista TABLA ---------- */
  function peopleBar(people, newPerson) {
    const chips = people.map(p =>
      '<div style="display:flex;align-items:center;gap:6px;background:var(--inset);border:1px solid var(--line);border-radius:999px;padding:4px 7px 4px 11px;font-size:12.5px">' +
        '<span style="font-weight:500">' + esc(p.name) + '</span>' +
        '<button data-act="removePerson" data-id="' + p.id + '" style="cursor:pointer;border:none;background:transparent;color:var(--muted);font-size:14px;line-height:1;width:15px;height:15px">×</button>' +
      '</div>').join('');
    return '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px">' +
      '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
        '<span style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-right:2px">Personas</span>' + chips +
      '</div>' +
      '<div style="display:flex;gap:7px">' +
        '<input id="new-person" data-act="newPerson" value="' + esc(newPerson) + '" placeholder="Agregar persona…" style="background:var(--inset);border:1px solid var(--line);border-radius:9px;color:var(--fg);padding:8px 12px;outline:none;font-size:13px;width:170px" />' +
        '<button data-act="addPerson" style="cursor:pointer;border:none;background:var(--accent);color:var(--accent-fg);border-radius:9px;padding:8px 15px;font-weight:600;font-size:13px">Agregar</button>' +
      '</div>' +
    '</div>';
  }
  function payerSelect(e, people) {
    const opts = ['<option value=""' + (e.payerId === '' ? ' selected' : '') + '>— nadie —</option>']
      .concat(people.map(p => '<option value="' + p.id + '"' + (e.payerId === p.id ? ' selected' : '') + '>' + esc(p.name) + '</option>'));
    return '<div style="position:relative;display:flex;align-items:center">' +
      '<select data-act="payer" data-exp="' + e.id + '" style="width:100%;background:var(--inset);border:1px solid var(--line);border-radius:8px;color:var(--fg);padding:7px 26px 7px 10px;outline:none;font-size:13px;font-weight:600;cursor:pointer">' + opts.join('') + '</select>' +
      '<span style="position:absolute;right:9px;pointer-events:none;color:var(--muted);font-size:9px">▼</span>' +
    '</div>';
  }
  function matrixCell(e, p) {
    const active = e.parts.includes(p.id);
    const isPayer = e.payerId === p.id;
    const mark = isPayer ? '$' : '';
    const markColor = active ? 'var(--accent-fg)' : 'var(--accent)';
    return '<td style="border-bottom:1px solid var(--line);border-left:1px solid var(--line);padding:0">' +
      '<button class="cell-btn" data-act="toggle" data-exp="' + e.id + '" data-person="' + p.id + '" style="position:relative;width:46px;height:46px;border:none;cursor:pointer;background:' +
        (active ? 'var(--accent)' : 'transparent') + ';--cell-hover:' + (active ? 'var(--accent)' : 'var(--inset)') + ';color:' + (active ? 'var(--accent-fg)' : 'var(--muted)') +
        ';font-size:16px;font-weight:700;transition:background .12s;display:flex;align-items:center;justify-content:center">' +
        '<span>' + (active ? '✓' : '') + '</span>' +
        '<span style="position:absolute;top:3px;right:4px;font-size:9px;font-weight:700;font-family:var(--font-num);color:' + markColor + '">' + mark + '</span>' +
      '</button>' +
    '</td>';
  }
  function matrix(s, owed, total) {
    const people = s.people;
    const thLbl = 'vertical-align:bottom;padding:12px 12px;border-bottom:1px solid var(--line);font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)';
    const head =
      '<thead><tr>' +
        '<th style="position:sticky;left:0;top:0;z-index:6;background:var(--panel);text-align:left;vertical-align:bottom;padding:12px 14px;border-bottom:1px solid var(--line);border-right:1px solid var(--line);font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);min-width:200px">Gasto</th>' +
        '<th style="' + thLbl + ';min-width:108px">Día</th>' +
        '<th style="' + thLbl + ';text-align:right;min-width:120px">Valor</th>' +
        '<th style="' + thLbl + ';min-width:130px">Pagó</th>' +
        people.map(p =>
          '<th style="background:var(--panel);border-bottom:1px solid var(--line);border-left:1px solid var(--line);padding:0;vertical-align:bottom;height:118px">' +
            '<div style="width:46px;height:118px;display:flex;align-items:flex-end;justify-content:center;overflow:visible">' +
              '<span style="display:inline-block;transform:rotate(-45deg);transform-origin:center;white-space:nowrap;font-size:12.5px;font-weight:600;margin-bottom:30px">' + esc(p.name) + '</span>' +
            '</div>' +
          '</th>').join('') +
        '<th style="' + thLbl + ';border-left:1px solid var(--line);text-align:right;min-width:104px">x cabeza</th>' +
      '</tr></thead>';

    const body = '<tbody>' + s.expenses.map(e => {
      const parts = e.parts.filter(pid => people.some(p => p.id === pid));
      const perHead = parts.length > 0 ? fmt((Number(e.valor) || 0) / parts.length) : '—';
      return '<tr>' +
        '<td style="position:sticky;left:0;z-index:2;background:var(--panel);border-bottom:1px solid var(--line);border-right:1px solid var(--line);padding:6px 12px;min-width:200px">' +
          '<div style="display:flex;align-items:center;gap:7px">' +
            '<button data-act="removeExpense" data-exp="' + e.id + '" title="Eliminar gasto" style="cursor:pointer;border:none;background:transparent;color:var(--muted);font-size:15px;line-height:1;flex:none;width:16px">×</button>' +
            '<input id="c-' + e.id + '" data-act="concepto" data-exp="' + e.id + '" value="' + esc(e.concepto) + '" placeholder="¿Qué fue?" style="flex:1;background:transparent;border:none;color:var(--fg);outline:none;font-weight:600;font-size:14.5px;font-family:var(--font-head);min-width:0" />' +
          '</div>' +
        '</td>' +
        '<td style="border-bottom:1px solid var(--line);padding:6px 10px">' +
          '<input id="d-' + e.id + '" data-act="dia" data-exp="' + e.id + '" value="' + esc(e.dia) + '" list="dias-list" placeholder="Día" style="width:98px;background:var(--inset);border:1px solid var(--line);border-radius:8px;color:var(--fg);padding:7px 10px;outline:none;font-size:13px;font-weight:500" />' +
        '</td>' +
        '<td style="border-bottom:1px solid var(--line);padding:6px 10px">' +
          '<div style="display:flex;align-items:center;gap:3px;background:var(--inset);border:1px solid var(--line);border-radius:8px;padding:5px 9px">' +
            '<span style="color:var(--muted);font-family:var(--font-num);font-size:13px">$</span>' +
            '<input id="v-' + e.id + '" data-act="valor" data-exp="' + e.id + '" value="' + (e.valor === 0 ? '' : e.valor) + '" type="number" inputmode="numeric" placeholder="0" style="width:84px;background:transparent;border:none;color:var(--fg);outline:none;font-family:var(--font-num);font-weight:700;font-size:14px;text-align:right" />' +
          '</div>' +
        '</td>' +
        '<td style="border-bottom:1px solid var(--line);padding:6px 10px">' + payerSelect(e, people) + '</td>' +
        people.map(p => matrixCell(e, p)).join('') +
        '<td style="border-bottom:1px solid var(--line);border-left:1px solid var(--line);padding:6px 12px;text-align:right;font-family:var(--font-num);font-weight:700;font-size:13px;white-space:nowrap">' + perHead + '</td>' +
      '</tr>';
    }).join('') + '</tbody>';

    const foot = '<tfoot><tr>' +
      '<td style="position:sticky;left:0;z-index:2;background:var(--inset);border-top:2px solid var(--line);border-right:1px solid var(--line);padding:12px 14px;font-weight:700;font-size:12.5px;font-family:var(--font-head)">Le toca a c/u</td>' +
      '<td style="background:var(--inset);border-top:2px solid var(--line)"></td>' +
      '<td style="background:var(--inset);border-top:2px solid var(--line);padding:12px 10px;text-align:right;font-family:var(--font-num);font-weight:700;font-size:13px;white-space:nowrap">' + fmt(total) + '</td>' +
      '<td style="background:var(--inset);border-top:2px solid var(--line)"></td>' +
      people.map(p =>
        '<td style="background:var(--inset);border-top:2px solid var(--line);border-left:1px solid var(--line);padding:10px 5px;text-align:center;font-family:var(--font-num);font-weight:700;font-size:10px;color:var(--accent);white-space:nowrap">' + fmt(owed[p.id]) + '</td>').join('') +
      '<td style="background:var(--inset);border-top:2px solid var(--line);border-left:1px solid var(--line)"></td>' +
    '</tr></tfoot>';

    return '<div class="matrix-scroll" style="overflow-x:auto;border:1px solid var(--line);border-radius:16px;background:var(--panel)">' +
      '<table style="border-collapse:separate;border-spacing:0;width:max-content;min-width:100%">' + head + body + foot + '</table>' +
    '</div>';
  }
  function tablaView(s, derived) {
    const summary =
      '<div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:22px;align-items:flex-start">' +
        '<div style="flex:2 1 460px;min-width:300px;background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:20px 22px">' +
          '<div style="font-family:var(--font-head);font-weight:700;font-size:18px;margin-bottom:4px">Saldos</div>' +
          '<div style="font-size:12.5px;color:var(--muted);margin-bottom:16px">Verde: le deben. Rojo: debe.</div>' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(212px,1fr));gap:8px">' +
            derived.balances.map(balanceGridItem).join('') +
          '</div>' +
        '</div>' +
        '<div style="flex:1 1 300px;min-width:280px;background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:20px 22px">' +
          '<div style="font-family:var(--font-head);font-weight:700;font-size:18px;margin-bottom:4px">Para quedar en paz</div>' +
          '<div style="font-size:12.5px;color:var(--muted);margin-bottom:14px">El mínimo de transferencias.</div>' +
          transfersBody(derived.transfers, s.expenses) +
        '</div>' +
      '</div>';
    return '<div>' +
      peopleBar(s.people, s.newPerson) +
      matrix(s, derived.owed, derived.total) +
      '<div style="margin-top:12px"><button data-act="addExpense" style="cursor:pointer;border:1px dashed var(--line);background:transparent;color:var(--accent);border-radius:10px;padding:10px 18px;font-weight:600;font-size:14px;width:100%">+ Agregar gasto</button></div>' +
      summary +
    '</div>';
  }

  /* ---------- vista TARJETAS ---------- */
  function expenseCard(e, people) {
    const parts = e.parts.filter(pid => people.some(p => p.id === pid));
    const perHead = parts.length > 0 ? fmt((Number(e.valor) || 0) / parts.length) : '—';
    const chips = people.map(p => {
      const active = e.parts.includes(p.id);
      return '<button data-act="toggle" data-exp="' + e.id + '" data-person="' + p.id + '" style="cursor:pointer;border:1px solid ' +
        (active ? 'var(--accent)' : 'var(--line)') + ';background:' + (active ? 'var(--accent)' : 'transparent') + ';color:' +
        (active ? 'var(--accent-fg)' : 'var(--muted)') + ';border-radius:999px;padding:7px 14px;font-size:13px;font-weight:500;transition:all .15s">' + esc(p.name) + '</button>';
    }).join('');
    return '<div style="background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:18px 20px">' +
      '<div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:14px">' +
        '<input id="c-' + e.id + '" data-act="concepto" data-exp="' + e.id + '" value="' + esc(e.concepto) + '" placeholder="¿Qué fue?" style="flex:1;background:transparent;border:none;border-bottom:1px solid var(--line);color:var(--fg);padding:6px 2px;outline:none;font-weight:600;font-size:16px;font-family:var(--font-head)" />' +
        '<div style="display:flex;align-items:center;gap:4px;background:var(--inset);border:1px solid var(--line);border-radius:10px;padding:6px 12px">' +
          '<span style="color:var(--muted);font-family:var(--font-num)">$</span>' +
          '<input id="v-' + e.id + '" data-act="valor" data-exp="' + e.id + '" value="' + (e.valor === 0 ? '' : e.valor) + '" type="number" inputmode="numeric" placeholder="0" style="width:108px;background:transparent;border:none;color:var(--fg);outline:none;font-family:var(--font-num);font-weight:700;font-size:16px;text-align:right" />' +
        '</div>' +
        '<button data-act="removeExpense" data-exp="' + e.id + '" style="cursor:pointer;border:1px solid var(--line);background:transparent;color:var(--muted);border-radius:9px;width:36px;height:36px;font-size:16px;flex:none">×</button>' +
      '</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:14px;align-items:center;margin-bottom:14px">' +
        '<div style="display:flex;align-items:center;gap:9px"><span style="font-size:13px;color:var(--muted)">Día</span>' +
          '<input id="d-' + e.id + '" data-act="dia" data-exp="' + e.id + '" value="' + esc(e.dia) + '" list="dias-list" placeholder="—" style="width:120px;background:var(--inset);border:1px solid var(--line);border-radius:9px;color:var(--fg);padding:8px 12px;outline:none;font-size:13.5px;font-weight:600" /></div>' +
        '<div style="display:flex;align-items:center;gap:9px"><span style="font-size:13px;color:var(--muted)">Pagó</span>' + payerSelect(e, people) + '</div>' +
        '<div style="display:flex;align-items:center;gap:7px;margin-left:auto;font-size:13px;color:var(--muted)">' +
          '<span style="font-family:var(--font-num);color:var(--fg);font-weight:700">' + perHead + '</span><span>x cabeza ·</span><span>' + parts.length + ' pers.</span>' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:9px">' +
        '<span style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:0.08em">Participaron</span>' +
        '<button data-act="all" data-exp="' + e.id + '" style="cursor:pointer;border:none;background:transparent;color:var(--accent);font-size:12px;font-weight:600;padding:2px 4px">Todos</button>' +
        '<button data-act="none" data-exp="' + e.id + '" style="cursor:pointer;border:none;background:transparent;color:var(--muted);font-size:12px;font-weight:600;padding:2px 4px">Nadie</button>' +
      '</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:7px">' + chips + '</div>' +
    '</div>';
  }
  function cardsView(s, derived) {
    const left =
      '<div style="flex:3 1 520px;min-width:320px;display:flex;flex-direction:column;gap:20px">' +
        '<div style="background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:20px 22px">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">' +
            '<div style="font-family:var(--font-head);font-weight:700;font-size:18px">Personas</div>' +
            '<div style="font-size:12.5px;color:var(--muted)">' + s.people.length + ' en el paseo</div>' +
          '</div>' +
          '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px">' +
            s.people.map(p =>
              '<div style="display:flex;align-items:center;gap:8px;background:var(--inset);border:1px solid var(--line);border-radius:999px;padding:6px 8px 6px 13px">' +
                '<span style="font-weight:500;font-size:13.5px">' + esc(p.name) + '</span>' +
                '<button data-act="removePerson" data-id="' + p.id + '" style="cursor:pointer;border:none;background:transparent;color:var(--muted);font-size:16px;line-height:1;width:18px;height:18px;display:flex;align-items:center;justify-content:center">×</button>' +
              '</div>').join('') +
          '</div>' +
          '<div style="display:flex;gap:8px">' +
            '<input id="new-person" data-act="newPerson" value="' + esc(s.newPerson) + '" placeholder="Agregar persona…" style="flex:1;background:var(--inset);border:1px solid var(--line);border-radius:10px;color:var(--fg);padding:10px 13px;outline:none;font-size:14px" />' +
            '<button data-act="addPerson" style="cursor:pointer;border:none;background:var(--accent);color:var(--accent-fg);border-radius:10px;padding:10px 18px;font-weight:600;font-size:14px">Agregar</button>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center">' +
          '<div style="font-family:var(--font-head);font-weight:700;font-size:18px">Gastos</div>' +
          '<button data-act="addExpense" style="cursor:pointer;border:1px dashed var(--line);background:transparent;color:var(--accent);border-radius:10px;padding:9px 16px;font-weight:600;font-size:14px">+ Nuevo gasto</button>' +
        '</div>' +
        s.expenses.map(e => expenseCard(e, s.people)).join('') +
      '</div>';
    const right =
      '<div style="flex:1 1 320px;min-width:300px;max-width:400px;position:sticky;top:20px;display:flex;flex-direction:column;gap:16px">' +
        '<div style="background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:20px 22px">' +
          '<div style="font-family:var(--font-head);font-weight:700;font-size:18px;margin-bottom:4px">Saldos</div>' +
          '<div style="font-size:12.5px;color:var(--muted);margin-bottom:16px">Cuánto puso y cuánto le toca a cada uno.</div>' +
          '<div style="display:flex;flex-direction:column;gap:2px">' + derived.balances.map(balanceListRow).join('') + '</div>' +
        '</div>' +
        '<div style="background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:20px 22px">' +
          '<div style="font-family:var(--font-head);font-weight:700;font-size:18px;margin-bottom:4px">Para quedar en paz</div>' +
          '<div style="font-size:12.5px;color:var(--muted);margin-bottom:14px">El mínimo de transferencias para saldar todo.</div>' +
          transfersBody(derived.transfers, s.expenses) +
        '</div>' +
      '</div>';
    return '<div style="display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start">' + left + right + '</div>';
  }

  /* ---------- render ---------- */
  function template(s) {
    const net = C.computeNets(s.people, s.expenses);
    const derived = {
      net,
      transfers: C.computeTransfers(s.people, net),
      owed: C.computeOwed(s.people, s.expenses),
      total: s.expenses.reduce((a, e) => a + (Number(e.valor) || 0), 0),
      balances: s.people.map(p => ({ id: p.id, name: p.name, net: net[p.id] || 0 })).sort((a, b) => b.net - a.net),
    };
    const t = C.THEMES.noche; // tema único
    const vars = Object.keys(t).map(k => k + ':' + t[k]).join(';');
    return '<div style="' + vars + ';min-height:100vh;background:var(--bg);color:var(--fg);font-family:var(--font-body);padding:30px 22px 70px;transition:background .35s ease,color .35s ease">' +
      '<div style="max-width:1240px;margin:0 auto">' +
        header(s) +
        statsBand(derived.total, s.people, s.expenses) +
        (s.view === 'cards' ? cardsView(s, derived) : tablaView(s, derived)) +
      '</div>' +
    '</div>';
  }
  function render() {
    const s = C.getState();
    const a = document.activeElement;
    const aid = a && a.id ? a.id : null;
    let ss = null, se = null;
    if (aid) { try { ss = a.selectionStart; se = a.selectionEnd; } catch (e) {} }
    root.innerHTML = template(s);
    document.body.style.background = (C.THEMES[s.theme] || C.THEMES.noche)['--bg'];
    if (aid) {
      const el = document.getElementById(aid);
      if (el) { el.focus(); if (ss != null) { try { el.setSelectionRange(ss, se); } catch (e) {} } }
    }
  }

  /* ---------- compartir ---------- */
  function onShare() {
    const text = C.buildSummary();
    if (navigator.share) { navigator.share({ title: 'Cuentas del paseo', text }).catch(() => {}); return; }
    try { window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank'); }
    catch (e) { try { navigator.clipboard.writeText(text); alert('Resumen copiado al portapapeles.'); } catch (_) {} }
  }

  /* ---------- eventos (delegación en #app, sobrevive a los re-render) ---------- */
  root.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-act]');
    if (!el || el.tagName === 'INPUT' || el.tagName === 'SELECT') return;
    const act = el.dataset.act, exp = el.dataset.exp, id = el.dataset.id;
    switch (act) {
      case 'view': C.setView(el.dataset.view); break;
      case 'share': onShare(); break;
      case 'load': if (confirm('¿Cargar el ejemplo? Reemplaza lo que tengas ahora.')) C.loadExample(); break;
      case 'clear': if (confirm('¿Vaciar todo? Se borran todas las personas y gastos.')) C.clearAll(); break;
      case 'addPerson': C.addPerson(); break;
      case 'removePerson': C.removePerson(id); break;
      case 'addExpense': C.addExpense(); break;
      case 'removeExpense': C.removeExpense(exp); break;
      case 'toggle': C.toggleParticipation(exp, el.dataset.person); break;
      case 'all': C.setAll(exp); break;
      case 'none': C.setNone(exp); break;
    }
  });
  // Campos de texto/número: actualizan el estado SIN redibujar (escritura fluida)
  // y avisan al sync por separado ('cuentas:field', con escritura debounced).
  const field = (detail) => window.dispatchEvent(new CustomEvent('cuentas:field', { detail }));
  root.addEventListener('input', (ev) => {
    const el = ev.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act, exp = el.dataset.exp, v = el.value;
    switch (act) {
      case 'tripName':  C.setTripName(v, true); field({ op: 'tripName', value: v }); break;
      case 'newPerson': C.setNewPerson(v); break; // buffer local: ni sync ni render
      case 'concepto':  C.updateExpense(exp, { concepto: v }, true); field({ op: 'updateExpense', id: exp, patch: { concepto: v } }); break;
      case 'dia':       C.updateExpense(exp, { dia: v }, true); field({ op: 'updateExpense', id: exp, patch: { dia: v } }); break;
      case 'valor': {
        const n = v === '' ? 0 : Number(v);
        C.updateExpense(exp, { valor: n }, true);
        field({ op: 'updateExpense', id: exp, patch: { valor: n } });
        break;
      }
    }
  });
  root.addEventListener('change', (ev) => {
    const el = ev.target.closest('[data-act]');
    if (!el) return;
    // El pagador es una acción discreta → mutación normal (redibuja + sincroniza).
    if (el.dataset.act === 'payer') { C.updateExpense(el.dataset.exp, { payerId: el.value }); return; }
    // Al confirmar un valor (blur/Enter), refrescamos los cálculos.
    if (el.dataset.act === 'valor') render();
  });
  root.addEventListener('keydown', (ev) => {
    const el = ev.target.closest('[data-act]');
    if (el && el.dataset.act === 'newPerson' && ev.key === 'Enter') C.addPerson();
  });

  window.addEventListener('cuentas:changed', render);        // cambios locales estructurales
  window.addEventListener('cuentas:remote-applied', render); // estado bajado del servidor
  render();
})();
