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
    const btns = [['tabla', 'Total'], ['yo', 'Yo'], ['recuerdos', 'Recuerdos']];
    return '<div style="display:flex;gap:4px;background:var(--panel);border:1px solid var(--line);border-radius:999px;padding:5px">' +
      btns.map(([k, l]) =>
        '<button data-act="view" data-view="' + k + '" style="border:none;cursor:pointer;border-radius:999px;padding:8px 14px;font-weight:600;font-size:13px;white-space:nowrap;background:' +
        (view === k ? 'var(--accent)' : 'transparent') + ';color:' + (view === k ? 'var(--accent-fg)' : 'var(--muted)') +
        ';transition:all .2s">' + l + '</button>').join('') +
      '</div>';
  }
  // (Selector de tema retirado: la app usa solo el tema "Noche".)
  function header(s) {
    return '' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px;flex-wrap:wrap;margin-bottom:22px">' +
        '<div style="min-width:260px">' +
          '<div style="font-family:var(--font-num);font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:var(--accent);margin-bottom:8px">Cuentas del paseo</div>' +
          '<input id="trip-name" data-act="tripName" value="' + esc(s.tripName) + '" placeholder="Nombre del paseo" style="font-family:var(--font-head);font-weight:700;font-size:34px;line-height:1.05;letter-spacing:-0.02em;color:var(--fg);background:transparent;border:none;outline:none;width:100%;padding:0" />' +
          '<div style="color:var(--muted);font-size:14px;margin-top:6px">Cada uno pone su chulo en la fila del gasto. Se calcula solo quién debe a quién.</div>' +
        '</div>' +
        '<div class="header-controls">' +
          viewToggle(s.view) +
          '<button data-act="share" style="cursor:pointer;border:none;background:var(--accent);color:var(--accent-fg);border-radius:9px;padding:9px 18px;font-size:13px;font-weight:700">Compartir</button>' +
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
  // Chulo de "confirmar" (azul) arriba del nombre: la persona da el OK a sus gastos.
  function confirmDot(p) {
    const on = !!p.confirmed;
    return '<button data-act="confirm" data-id="' + p.id + '" title="' + (on ? 'Confirmado — toca para deshacer' : 'Confirmar mis gastos') +
      '" style="position:absolute;top:7px;left:50%;transform:translateX(-50%);width:20px;height:20px;border-radius:50%;cursor:pointer;line-height:1;padding:0;border:2px solid ' +
      (on ? 'var(--confirm)' : 'var(--line)') + ';background:' + (on ? 'var(--confirm)' : 'transparent') +
      ';color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700">' + (on ? '✓' : '') + '</button>';
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
          '<th style="position:relative;background:var(--panel);border-bottom:1px solid var(--line);border-left:1px solid var(--line);padding:0;vertical-align:bottom;height:118px">' +
            confirmDot(p) +
            '<div style="width:46px;height:118px;display:flex;align-items:flex-end;justify-content:center;overflow:visible">' +
              '<span style="display:inline-block;transform:rotate(-45deg);transform-origin:center;white-space:nowrap;font-size:12.5px;font-weight:600;margin-bottom:30px">' + esc(p.name) + '</span>' +
            '</div>' +
          '</th>').join('') +
        '<th style="' + thLbl + ';border-left:1px solid var(--line);text-align:right;min-width:104px">x cabeza</th>' +
      '</tr></thead>';

    const body = '<tbody>' + s.expenses.map(e => {
      const parts = e.parts.filter(pid => people.some(p => p.id === pid));
      const perHead = parts.length > 0 ? fmt((Number(e.valor) || 0) / parts.length) : '—';
      const payerName = (people.find(p => p.id === e.payerId) || {}).name || '— nadie —';
      return '<tr>' +
        '<td style="position:sticky;left:0;z-index:2;background:var(--panel);border-bottom:1px solid var(--line);border-right:1px solid var(--line);padding:0;min-width:200px">' +
          '<button data-act="editExpense" data-exp="' + e.id + '" title="Editar gasto" style="cursor:pointer;width:100%;text-align:left;border:none;background:transparent;color:var(--fg);padding:11px 12px;display:flex;align-items:center;gap:8px;font-family:var(--font-head)">' +
            '<span style="font-weight:600;font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0' + (e.concepto ? '' : ';color:var(--muted)') + '">' + esc(e.concepto || 'Sin nombre') + '</span>' +
            '<span style="margin-left:auto;color:var(--muted);font-size:12px;flex:none">✎</span>' +
          '</button>' +
        '</td>' +
        '<td style="border-bottom:1px solid var(--line);padding:11px 12px;font-size:13px;color:var(--muted);white-space:nowrap">' + (esc(e.dia) || '—') + '</td>' +
        '<td style="border-bottom:1px solid var(--line);padding:11px 12px;text-align:right;font-family:var(--font-num);font-weight:700;font-size:14px;white-space:nowrap">' + (e.valor ? fmt(e.valor) : '—') + '</td>' +
        '<td style="border-bottom:1px solid var(--line);padding:11px 12px;font-size:13px;font-weight:600;white-space:nowrap">' + esc(payerName) + '</td>' +
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
    const confirmedN = s.people.filter(p => p.confirmed).length;
    const allConfirmed = s.people.length > 0 && confirmedN === s.people.length;
    const canDownload = allConfirmed && derived.transfers.length > 0;
    const settleFooter =
      '<div style="margin-top:16px;border-top:1px solid var(--line);padding-top:14px">' +
        '<div style="font-size:12.5px;margin-bottom:10px;color:' + (allConfirmed ? 'var(--confirm)' : 'var(--muted)') + ';font-weight:' + (allConfirmed ? '700' : '400') + '">' +
          (allConfirmed ? '✓ Todos confirmaron — listos para pagar' : 'Confirmaron ' + confirmedN + ' de ' + s.people.length) +
        '</div>' +
        '<button data-act="downloadSettlement"' + (canDownload ? '' : ' disabled') +
          ' style="width:100%;border:none;border-radius:10px;padding:12px;font-size:13.5px;font-weight:700;cursor:' + (canDownload ? 'pointer' : 'not-allowed') +
          ';background:' + (canDownload ? 'var(--confirm)' : 'var(--inset)') + ';color:' + (canDownload ? '#fff' : 'var(--muted)') + '">' +
          (allConfirmed ? '⬇ Descargar imagen para pagar' : 'Descargar (faltan ' + (s.people.length - confirmedN) + ')') +
        '</button>' +
      '</div>';
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
          settleFooter +
        '</div>' +
      '</div>';
    return '<div>' +
      peopleBar(s.people, s.newPerson) +
      matrix(s, derived.owed, derived.total) +
      '<div style="margin-top:12px"><button data-act="addExpense" style="cursor:pointer;border:1px dashed var(--line);background:transparent;color:var(--accent);border-radius:10px;padding:10px 18px;font-weight:600;font-size:14px;width:100%">+ Agregar gasto</button></div>' +
      summary +
      '<div style="margin-top:36px;text-align:center">' +
        '<button data-act="clear" style="cursor:pointer;border:none;background:transparent;color:var(--muted);opacity:.55;font-size:12px;text-decoration:underline;padding:6px 10px">Vaciar todo</button>' +
      '</div>' +
    '</div>';
  }

  /* ---------- vista YO (hoja personal: filtra una persona) ----------
     Comparte el MISMO estado que el Total: marcar un chulo aquí llama a la
     misma toggleParticipation → se refleja en la tabla y en el sync al instante.
     La persona elegida vive solo en memoria (el Total es siempre el landing). */
  let yoId = null;
  function yoPicker(people) {
    const grid = people.length === 0
      ? '<div style="color:var(--muted);font-size:14px">Aún no hay personas. Agrégalas en la vista Total.</div>'
      : '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px">' +
          people.map(p =>
            '<button data-act="yoPick" data-id="' + p.id + '" style="cursor:pointer;display:flex;align-items:center;gap:10px;background:var(--inset);border:1px solid var(--line);border-radius:12px;padding:12px 14px;color:var(--fg);text-align:left">' +
              avatar(C.initials(p.name), 32) +
              '<span style="font-weight:600;font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(p.name) + '</span>' +
            '</button>').join('') +
        '</div>';
    return '<div style="max-width:640px;margin:0 auto;background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:26px 24px">' +
      '<div style="font-family:var(--font-head);font-weight:700;font-size:22px;margin-bottom:5px">¿Quién eres?</div>' +
      '<div style="color:var(--muted);font-size:14px;margin-bottom:20px">Elige tu nombre para ver y marcar solo lo tuyo. Lo que cambies aquí se ve en el Total al instante.</div>' +
      grid +
    '</div>';
  }
  function yoDashboard(s, derived, me) {
    const myNet = derived.net[me.id] || 0;
    const paid = s.expenses.reduce((a, e) => a + (e.payerId === me.id ? (Number(e.valor) || 0) : 0), 0);
    const owed = derived.owed[me.id] || 0;
    const bd = balanceData({ name: me.name, net: myNet });
    const myTransfers = derived.transfers.filter(t => t.from === me.name || t.to === me.name);
    const inCount = s.expenses.filter(e => e.parts.includes(me.id)).length;

    const chip =
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px;flex-wrap:wrap">' +
        '<div style="display:flex;align-items:center;gap:11px">' + avatar(C.initials(me.name), 38) +
          '<div><div style="font-family:var(--font-head);font-weight:700;font-size:20px">' + esc(me.name) + '</div>' +
          '<div style="font-size:12.5px;color:var(--muted)">Tu vista personal · marca lo que consumiste</div></div>' +
        '</div>' +
        '<button data-act="yoClear" style="cursor:pointer;border:1px solid var(--line);background:var(--panel);color:var(--muted);border-radius:9px;padding:8px 14px;font-size:13px;font-weight:600">Cambiar persona</button>' +
      '</div>';

    const balCard =
      '<div style="background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:20px 22px;margin-bottom:16px">' +
        '<div style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;margin-bottom:7px">Tu saldo</div>' +
        '<div style="font-family:var(--font-num);font-weight:700;font-size:34px;color:' + bd.color + '">' + bd.amountFmt + '</div>' +
        '<div style="font-size:13.5px;color:var(--muted);margin-top:4px">' + (Math.abs(myNet) < 1 ? 'Estás en paz 🎉' : (myNet > 0 ? 'Te deben en total' : 'Debes en total')) + '</div>' +
        '<div style="display:flex;gap:26px;margin-top:16px;flex-wrap:wrap">' +
          '<div><div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px">Pusiste</div><div style="font-family:var(--font-num);font-weight:700;font-size:17px">' + fmt(paid) + '</div></div>' +
          '<div><div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px">Te toca</div><div style="font-family:var(--font-num);font-weight:700;font-size:17px">' + fmt(owed) + '</div></div>' +
        '</div>' +
      '</div>';

    const transRows = myTransfers.map(t => {
      const youPay = t.from === me.name;
      const other = youPay ? t.to : t.from;
      return '<div style="display:flex;align-items:center;gap:9px;background:var(--inset);border:1px solid var(--line);border-radius:12px;padding:11px 13px">' +
        '<span style="font-weight:700;font-size:12.5px;color:' + (youPay ? 'var(--neg)' : 'var(--pos)') + '">' + (youPay ? 'Le pagas a' : 'Te paga') + '</span>' +
        '<span style="font-weight:600;font-size:13.5px">' + esc(other) + '</span>' +
        '<span style="margin-left:auto;font-family:var(--font-num);font-weight:700;font-size:14px;color:var(--accent)">' + fmt(t.amount) + '</span>' +
      '</div>';
    }).join('');
    const transCard =
      '<div style="background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:20px 22px;margin-bottom:16px">' +
        '<div style="font-family:var(--font-head);font-weight:700;font-size:17px;margin-bottom:' + (myTransfers.length ? '14px' : '6px') + '">Para quedar en paz</div>' +
        (myTransfers.length
          ? '<div style="display:flex;flex-direction:column;gap:9px">' + transRows + '</div>'
          : '<div style="color:var(--muted);font-size:13.5px">' + (Math.abs(myNet) < 1 ? 'No debes ni te deben nada.' : 'Sin transferencias por ahora.') + '</div>') +
      '</div>';

    const expRows = s.expenses.map(e => {
      const inIt = e.parts.includes(me.id);
      const partsN = e.parts.filter(pid => s.people.some(p => p.id === pid)).length;
      const share = inIt && partsN > 0 ? fmt((Number(e.valor) || 0) / partsN) : '—';
      const iPaid = e.payerId === me.id;
      const payerTxt = iPaid ? '<span style="color:var(--accent);font-weight:700">Pagaste tú</span>'
        : ('Pagó ' + esc((s.people.find(p => p.id === e.payerId) || {}).name || '—'));
      return '<button data-act="toggle" data-exp="' + e.id + '" data-person="' + me.id + '" style="cursor:pointer;width:100%;text-align:left;display:flex;align-items:center;gap:13px;background:' +
          (inIt ? 'var(--inset)' : 'transparent') + ';border:1px solid ' + (inIt ? 'var(--accent)' : 'var(--line)') + ';border-radius:14px;padding:14px 15px;transition:background .12s,border-color .12s">' +
        '<span style="flex:none;width:28px;height:28px;border-radius:50%;border:2px solid ' + (inIt ? 'var(--accent)' : 'var(--line)') + ';background:' + (inIt ? 'var(--accent)' : 'transparent') + ';color:var(--accent-fg);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700">' + (inIt ? '✓' : '') + '</span>' +
        '<span style="flex:1;min-width:0">' +
          '<span style="display:block;font-family:var(--font-head);font-weight:600;font-size:15px;color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(e.concepto || 'Sin nombre') + '</span>' +
          '<span style="display:block;font-size:12.5px;color:var(--muted);margin-top:3px">' + (e.dia ? esc(e.dia) + ' · ' : '') + payerTxt + ' · ' + (e.valor ? fmt(e.valor) : '—') + '</span>' +
        '</span>' +
        '<span style="flex:none;text-align:right;font-family:var(--font-num);font-weight:700;font-size:14px;color:' + (inIt ? 'var(--neg)' : 'var(--muted)') + '">' + (inIt ? '−' + share : '—') + '</span>' +
      '</button>';
    }).join('');
    const expCard =
      '<div style="background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:18px 20px;margin-bottom:16px">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">' +
          '<div style="font-family:var(--font-head);font-weight:700;font-size:17px">Gastos que participé</div>' +
          '<div style="font-size:12.5px;color:var(--muted)">Marcaste ' + inCount + ' de ' + s.expenses.length + '</div>' +
        '</div>' +
        (s.expenses.length
          ? '<div style="display:flex;flex-direction:column;gap:9px">' + expRows + '</div>'
          : '<div style="color:var(--muted);font-size:13.5px">Aún no hay gastos. Agrégalos en la vista Total.</div>') +
      '</div>';

    const on = !!me.confirmed;
    const confirmBanner =
      '<button data-act="confirm" data-id="' + me.id + '" style="width:100%;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;border-radius:14px;padding:14px;margin-bottom:16px;font-size:14.5px;font-weight:700;border:1px solid var(--confirm);background:' +
        (on ? 'var(--confirm)' : 'transparent') + ';color:' + (on ? '#fff' : 'var(--confirm)') + '">' +
        '<span style="width:22px;height:22px;border-radius:50%;border:2px solid ' + (on ? '#fff' : 'var(--confirm)') + ';display:flex;align-items:center;justify-content:center;font-size:13px">' + (on ? '✓' : '') + '</span>' +
        (on ? 'Confirmado · toca para deshacer' : 'Revisé mis gastos — Confirmar') +
      '</button>';
    return '<div style="max-width:640px;margin:0 auto">' + chip + confirmBanner + balCard + expCard + transCard + '</div>';
  }
  function yoView(s, derived) {
    const me = yoId ? s.people.find(p => p.id === yoId) : null;
    if (!me) { yoId = null; return yoPicker(s.people); }
    return yoDashboard(s, derived, me);
  }

  /* ---------- vista RECUERDOS (galería tipo slideshow) ----------
     Fotos en Supabase Storage; cada foto = una fila en `memories`. La galería
     transiciona sola (fade) y se puede navegar/subir/borrar. El slideshow se
     maneja con DOM directo (opacidad) para NO re-renderizar todo cada 4.5s. */
  let recIdx = 0, recTimer = null, recPaused = false;

  function recHeader() {
    return '<div style="text-align:center;margin-bottom:18px">' +
      '<div style="font-family:var(--font-head);font-weight:700;font-size:24px">Recuerdos del paseo</div>' +
      '<div style="color:var(--muted);font-size:14px;margin-top:5px">La prueba de que sí valió la pena 😄 — a pagar con cariño.</div>' +
    '</div>';
  }
  function recUploadBtn(label) {
    return '<div style="text-align:center;margin-top:18px">' +
      '<label style="cursor:pointer;display:inline-flex;align-items:center;gap:8px;border:1px dashed var(--line);background:transparent;color:var(--accent);border-radius:12px;padding:12px 22px;font-weight:600;font-size:14px">' +
        '<span style="font-size:17px">＋</span> ' + label +
        '<input data-act="recFile" type="file" accept="image/*,.heic,.heif" multiple style="display:none" /></label>' +
    '</div>';
  }
  function recuerdosView(s) {
    const mems = s.memories || [];
    if (mems.length === 0) {
      return '<div style="max-width:680px;margin:0 auto">' + recHeader() +
        '<div style="background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:48px 24px;text-align:center">' +
          '<div style="font-size:46px;margin-bottom:10px">📸</div>' +
          '<div style="font-weight:600;font-size:16px;margin-bottom:6px">Aún no hay fotos</div>' +
          '<div style="color:var(--muted);font-size:14px;max-width:360px;margin:0 auto">Sube las del paseo para revivirlo (y de paso molestar a alguien).</div>' +
        '</div>' + recUploadBtn('Subir fotos') +
      '</div>';
    }
    if (recIdx >= mems.length) recIdx = 0;
    const slide = (m, i) =>
      '<div class="rec-slide" data-i="' + i + '" style="position:absolute;inset:0;opacity:' + (i === recIdx ? '1' : '0') +
        ';transition:opacity .8s ease;pointer-events:' + (i === recIdx ? 'auto' : 'none') + '">' +
        '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">' +
          '<img src="' + esc(m.url) + '" alt="" loading="lazy" style="max-width:100%;max-height:100%;object-fit:contain;display:block" />' +
        '</div>' +
        '<button data-act="recDelete" data-id="' + m.id + '" title="Borrar foto" style="position:absolute;top:10px;right:10px;width:34px;height:34px;border-radius:50%;border:none;cursor:pointer;background:rgba(0,0,0,.45);color:#fff;font-size:15px;line-height:1;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px)">🗑</button>' +
        '<div style="position:absolute;left:0;right:0;bottom:0;padding:26px 16px 14px;background:linear-gradient(transparent,rgba(0,0,0,.78))">' +
          '<input id="cap-' + m.id + '" data-act="memoryCaption" data-id="' + m.id + '" value="' + esc(m.caption) + '" placeholder="Escribe algo para molestar… 😏" style="width:100%;background:transparent;border:none;outline:none;color:#fff;font-size:15.5px;font-weight:600;text-align:center;font-family:var(--font-body)" /></div>' +
      '</div>';
    const navBtn = (act, sym, side) =>
      '<button data-act="' + act + '" style="position:absolute;top:50%;' + side + ':10px;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;border:none;cursor:pointer;background:rgba(0,0,0,.4);color:#fff;font-size:24px;line-height:1;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px)">' + sym + '</button>';
    const nav = mems.length > 1 ? navBtn('recPrev', '‹', 'left') + navBtn('recNext', '›', 'right') : '';
    const stage =
      '<div class="rec-stage" style="position:relative;height:min(68vh,540px);background:#08080a;border:1px solid var(--line);border-radius:18px;overflow:hidden">' +
        mems.map(slide).join('') + nav +
      '</div>';
    const counter = mems.length > 1
      ? '<div id="rec-counter" style="text-align:center;color:var(--muted);font-size:12.5px;margin-top:10px;font-family:var(--font-num)">' + (recIdx + 1) + ' / ' + mems.length + '</div>'
      : '';
    const thumbs = mems.length > 1
      ? '<div style="display:flex;gap:8px;overflow-x:auto;padding:12px 2px 4px;margin-top:6px">' +
          mems.map((m, i) =>
            '<button data-act="recGo" data-i="' + i + '" style="flex:0 0 auto;width:64px;height:64px;border-radius:10px;overflow:hidden;cursor:pointer;padding:0;background:#08080a;border:2px solid ' +
              (i === recIdx ? 'var(--accent)' : 'transparent') + ';opacity:' + (i === recIdx ? '1' : '.55') + '">' +
              '<img src="' + esc(m.url) + '" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block" /></button>').join('') +
        '</div>'
      : '';
    return '<div style="max-width:760px;margin:0 auto">' + recHeader() + stage + counter + thumbs + recUploadBtn('Agregar más fotos') + '</div>';
  }

  /* ---------- control del slideshow (DOM directo, sin re-render) ---------- */
  function recStop() { if (recTimer) { clearInterval(recTimer); recTimer = null; } }
  function recShow(i) {
    const stage = root.querySelector('.rec-stage');
    if (!stage) { recStop(); return; }
    const slides = stage.querySelectorAll('.rec-slide');
    const n = slides.length;
    if (!n) { recStop(); return; }
    recIdx = ((i % n) + n) % n;
    slides.forEach(sl => {
      const on = Number(sl.dataset.i) === recIdx;
      sl.style.opacity = on ? '1' : '0';
      sl.style.pointerEvents = on ? 'auto' : 'none';
    });
    root.querySelectorAll('[data-act="recGo"]').forEach(t => {
      const on = Number(t.dataset.i) === recIdx;
      t.style.borderColor = on ? 'var(--accent)' : 'transparent';
      t.style.opacity = on ? '1' : '.55';
    });
    const counter = root.querySelector('#rec-counter');
    if (counter) counter.textContent = (recIdx + 1) + ' / ' + n;
  }
  function recNext() { recShow(recIdx + 1); }
  function recPrev() { recShow(recIdx - 1); }
  function recStart() {
    recStop();
    if (C.getState().view !== 'recuerdos') return;
    if ((C.getState().memories || []).length <= 1) return;
    recTimer = setInterval(() => { if (!recPaused) recNext(); }, 4500);
  }
  function setupRecuerdos() {
    if (C.getState().view !== 'recuerdos') { recStop(); return; }
    const stage = root.querySelector('.rec-stage');
    if (stage) {
      // Pausar el auto-avance mientras se mira/edita (mouse encima o caption con foco).
      stage.addEventListener('mouseenter', () => { recPaused = true; });
      stage.addEventListener('mouseleave', () => { recPaused = false; });
      stage.addEventListener('focusin', () => { recPaused = true; });
      stage.addEventListener('focusout', () => { recPaused = false; });
    }
    recStart();
  }

  /* ---------- subir fotos (comprimir + corregir orientación + Storage) ----------
     HEIC (iPhone): el iPhone suele entregar JPEG al subir desde su navegador, pero
     desde computador/Mac llega .heic, que Chrome/Firefox no decodifican. Cargamos
     un conversor (heic2any) SOLO cuando aparece un HEIC, para no pesar de más. */
  const isHeic = f => /image\/hei[cf]/i.test(f.type || '') || /\.hei[cf]$/i.test(f.name || '');
  function loadScript(src) {
    return new Promise((res, rej) => {
      const sc = document.createElement('script');
      sc.src = src; sc.onload = res; sc.onerror = () => rej(new Error('no carga ' + src));
      document.head.appendChild(sc);
    });
  }
  async function heicToJpeg(file) {
    if (!window.heic2any) await loadScript('https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js');
    const out = await window.heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
    return Array.isArray(out) ? out[0] : out;
  }
  async function compressImage(file, maxSide, quality) {
    maxSide = maxSide || 1600; quality = quality || 0.82;
    const src = isHeic(file) ? await heicToJpeg(file) : file;
    let bmp;
    try { bmp = await createImageBitmap(src, { imageOrientation: 'from-image' }); }
    catch (e) { bmp = await createImageBitmap(src); } // navegador viejo: sin corrección EXIF
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    cv.getContext('2d').drawImage(bmp, 0, 0, w, h);
    if (bmp.close) bmp.close();
    return await new Promise((res, rej) =>
      cv.toBlob(b => b ? res(b) : rej(new Error('toBlob null')), 'image/jpeg', quality));
  }
  async function handlePhotoFiles(fileList) {
    // HEIC en Windows llega con type vacío → aceptar también por extensión.
    const files = [...(fileList || [])].filter(f => (f.type && f.type.indexOf('image/') === 0) || isHeic(f));
    if (!files.length) return;
    if (!window.CuentasSync || !window.CuentasSync.uploadPhoto) {
      toast('Necesitas conexión a Supabase para subir fotos.'); return;
    }
    for (let k = 0; k < files.length; k++) {
      toast('Procesando foto ' + (k + 1) + ' de ' + files.length + '…', true);
      try {
        const blob = await compressImage(files[k]);
        const id = C.uid('m');
        const { url, path } = await window.CuentasSync.uploadPhoto(blob, id);
        C.addMemory({ id, url, path, caption: '' }); // emite → render() reconstruye la galería
        recIdx = (C.getState().memories || []).length - 1; // saltar a la recién subida
        recShow(recIdx);
      } catch (e) {
        console.error('[recuerdos] subir', e);
        toast('No se pudo subir una foto 😕 (revisa el bucket en Supabase)');
      }
    }
    toast('¡Listo! 📸');
  }

  /* ---------- toast (vive fuera de #app, sobrevive a los re-render) ---------- */
  let toastEl = null, toastTimer = null;
  function toast(msg, sticky) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.style.cssText = themeVars() + ';position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:120;background:var(--panel);color:var(--fg);border:1px solid var(--line);border-radius:999px;padding:10px 18px;box-shadow:0 8px 24px rgba(0,0,0,.4);font-family:var(--font-body);font-weight:600;font-size:13px';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.style.display = 'block';
    clearTimeout(toastTimer);
    if (!sticky) toastTimer = setTimeout(() => { if (toastEl) toastEl.style.display = 'none'; }, 2200);
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
        (s.view === 'yo'
          ? yoView(s, derived)
          : s.view === 'recuerdos'
            ? recuerdosView(s)
            : statsBand(derived.total, s.people, s.expenses) + tablaView(s, derived)) +
      '</div>' +
    '</div>';
  }
  function render() {
    const s = C.getState();
    const a = document.activeElement;
    const aid = a && a.id ? a.id : null;
    let ss = null, se = null;
    if (aid) { try { ss = a.selectionStart; se = a.selectionEnd; } catch (e) {} }
    // Guardar el scroll de la matriz: al marcar un chulo se reconstruye todo el HTML
    // y el contenedor nuevo arrancaría en 0 (rebote a la izquierda en el celular).
    const prevMatrix = root.querySelector('.matrix-scroll');
    const mx = prevMatrix ? prevMatrix.scrollLeft : 0;
    const my = prevMatrix ? prevMatrix.scrollTop : 0;
    root.innerHTML = template(s);
    document.body.style.background = (C.THEMES[s.theme] || C.THEMES.noche)['--bg'];
    if (aid) {
      const el = document.getElementById(aid);
      // preventScroll: no dejar que el foco recolocado mueva la matriz por su cuenta.
      if (el) { el.focus({ preventScroll: true }); if (ss != null) { try { el.setSelectionRange(ss, se); } catch (e) {} } }
    }
    // Restaurar el scroll al final para que gane sobre cualquier ajuste del foco.
    const nextMatrix = root.querySelector('.matrix-scroll');
    if (nextMatrix) { nextMatrix.scrollLeft = mx; nextMatrix.scrollTop = my; }
    setupRecuerdos(); // (re)inicia el slideshow si estamos en la hoja Recuerdos
  }

  /* ---------- compartir ---------- */
  function onShare() {
    const text = C.buildSummary();
    // Plan B: WhatsApp Web; y si eso falla, portapapeles. Sirve en compu donde
    // navigator.share no existe o falla en silencio.
    const fallback = () => {
      try { window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank'); }
      catch (e) { try { navigator.clipboard.writeText(text); alert('Resumen copiado al portapapeles.'); } catch (_) {} }
    };
    if (navigator.share) {
      navigator.share({ title: 'Cuentas del paseo', text }).catch((err) => {
        if (err && err.name === 'AbortError') return; // el usuario canceló a propósito
        fallback();
      });
      return;
    }
    fallback();
  }

  /* ---------- formulario de gasto (modal) ----------
     Vive FUERA de #app: así los re-render (locales o remotos) no lo borran
     mientras se escribe. Lleva las variables del tema en el overlay. */
  const themeVars = () => { const t = C.THEMES.noche; return Object.keys(t).map(k => k + ':' + t[k]).join(';'); };
  let modalRoot = null;
  function closeExpenseForm() { if (modalRoot) modalRoot.innerHTML = ''; }
  function openExpenseForm(id) {
    if (!modalRoot) { modalRoot = document.createElement('div'); document.body.appendChild(modalRoot); }
    const s = C.getState();
    const exp = id ? s.expenses.find(e => e.id === id) : null;
    const isNew = !exp;
    const inS = 'width:100%;background:var(--inset);border:1px solid var(--line);border-radius:10px;color:var(--fg);padding:11px 13px;outline:none;font-size:15px;font-family:var(--font-body)';
    const lbl = 'display:block;font-size:11.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px';
    const payerOpts = ['<option value="">— nadie —</option>'].concat(
      s.people.map(p => '<option value="' + p.id + '"' + (exp && exp.payerId === p.id ? ' selected' : '') + '>' + esc(p.name) + '</option>')
    ).join('');
    modalRoot.innerHTML =
      '<div data-overlay style="' + themeVars() + ';position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:18px;font-family:var(--font-body)">' +
        '<div data-panel style="width:min(440px,100%);max-height:90vh;overflow:auto;background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:22px 22px 20px;color:var(--fg);box-shadow:0 18px 50px rgba(0,0,0,.5)">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">' +
            '<div style="font-family:var(--font-head);font-weight:700;font-size:20px">' + (isNew ? 'Nuevo gasto' : 'Editar gasto') + '</div>' +
            '<button data-close style="cursor:pointer;border:none;background:transparent;color:var(--muted);font-size:22px;line-height:1;width:30px;height:30px">×</button>' +
          '</div>' +
          '<label style="display:block;margin-bottom:14px"><span style="' + lbl + '">¿Qué fue?</span>' +
            '<input id="mf-concepto" value="' + esc(exp ? exp.concepto : '') + '" placeholder="Ej: Cervezas, Van, Mercado…" style="' + inS + '" /></label>' +
          '<div style="display:flex;gap:12px;margin-bottom:14px">' +
            '<label style="flex:1"><span style="' + lbl + '">Día</span>' +
              '<input id="mf-dia" value="' + esc(exp ? exp.dia : '') + '" list="dias-list" placeholder="—" style="' + inS + '" /></label>' +
            '<label style="flex:1"><span style="' + lbl + '">Monto</span>' +
              '<input id="mf-valor" type="number" inputmode="numeric" value="' + (exp && exp.valor ? exp.valor : '') + '" placeholder="0" style="' + inS + ';font-family:var(--font-num);font-weight:700" /></label>' +
          '</div>' +
          '<label style="display:block;margin-bottom:22px"><span style="' + lbl + '">¿Quién pagó?</span>' +
            '<select id="mf-payer" style="' + inS + ';font-weight:600;cursor:pointer">' + payerOpts + '</select></label>' +
          '<div style="display:flex;gap:10px">' +
            '<button data-cancel style="flex:1;cursor:pointer;border:1px solid var(--line);background:transparent;color:var(--fg);border-radius:10px;padding:12px;font-size:14px;font-weight:600">Cancelar</button>' +
            '<button data-save style="flex:1;cursor:pointer;border:none;background:var(--accent);color:var(--accent-fg);border-radius:10px;padding:12px;font-size:14px;font-weight:700">Guardar</button>' +
          '</div>' +
          (isNew ? '' :
            '<button data-delete style="width:100%;margin-top:12px;cursor:pointer;border:none;background:transparent;color:var(--neg);border-radius:10px;padding:10px;font-size:13px;font-weight:600">Eliminar gasto</button>') +
        '</div>' +
      '</div>';

    const overlay = modalRoot.firstElementChild;
    const panel = overlay.querySelector('[data-panel]');
    const save = () => {
      const concepto = panel.querySelector('#mf-concepto').value.trim();
      const dia = panel.querySelector('#mf-dia').value.trim();
      const vRaw = panel.querySelector('#mf-valor').value;
      const valor = vRaw === '' ? 0 : Math.max(0, Math.round(Number(vRaw) || 0));
      const payerId = panel.querySelector('#mf-payer').value;
      if (isNew && !concepto && !valor) { panel.querySelector('#mf-concepto').focus(); return; }
      closeExpenseForm();
      if (isNew) C.addExpense({ concepto, dia, valor, payerId });
      else C.updateExpense(id, { concepto, dia, valor, payerId });
    };
    overlay.addEventListener('mousedown', (ev) => { if (ev.target === overlay) closeExpenseForm(); });
    panel.querySelector('[data-close]').addEventListener('click', closeExpenseForm);
    panel.querySelector('[data-cancel]').addEventListener('click', closeExpenseForm);
    panel.querySelector('[data-save]').addEventListener('click', save);
    const del = panel.querySelector('[data-delete]');
    if (del) del.addEventListener('click', () => { if (confirm('¿Eliminar este gasto?')) { closeExpenseForm(); C.removeExpense(id); } });
    panel.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') { ev.preventDefault(); closeExpenseForm(); }
      else if (ev.key === 'Enter' && ev.target.tagName !== 'SELECT') { ev.preventDefault(); save(); }
    });
    const first = panel.querySelector('#mf-concepto');
    if (first) first.focus();
  }

  /* ---------- imagen "Para quedar en paz" (canvas, sin librerías) ---------- */
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  async function downloadSettlement() {
    const s = C.getState();
    const net = C.computeNets(s.people, s.expenses);
    const transfers = C.computeTransfers(s.people, net);
    const total = s.expenses.reduce((a, e) => a + (Number(e.valor) || 0), 0);
    try { await document.fonts.ready; } catch (e) {}
    const W = 720, padX = 44, rowH = 56, startY = 188;
    const H = startY + Math.max(transfers.length, 1) * rowH + 56;
    const sc = 2;
    const cv = document.createElement('canvas');
    cv.width = W * sc; cv.height = H * sc;
    const ctx = cv.getContext('2d');
    ctx.scale(sc, sc);
    ctx.fillStyle = '#0a0a0c'; ctx.fillRect(0, 0, W, H);
    roundRect(ctx, 18, 18, W - 36, H - 36, 26); ctx.fillStyle = '#141319'; ctx.fill();
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#c2f24a'; ctx.font = '700 13px "Space Mono", monospace';
    ctx.fillText('CUENTAS DEL PASEO', padX, 66);
    ctx.fillStyle = '#f4f4f6'; ctx.font = '700 34px "Space Grotesk", sans-serif';
    ctx.fillText('Para quedar en paz', padX, 106);
    ctx.fillStyle = '#8c8b98'; ctx.font = '500 15px "Space Grotesk", sans-serif';
    ctx.fillText((s.tripName || 'Paseo') + '  ·  Total ' + C.fmt(total), padX, 134);
    ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padX, 158); ctx.lineTo(W - padX, 158); ctx.stroke();
    ctx.textBaseline = 'middle';
    if (transfers.length === 0) {
      ctx.fillStyle = '#65e6a1'; ctx.font = '600 18px "Space Grotesk", sans-serif';
      ctx.fillText('¡Todo saldado! Nadie debe nada.', padX, startY + 12);
    } else {
      transfers.forEach((t, i) => {
        const top = startY + i * rowH, cy = top + 21;
        roundRect(ctx, padX, top, W - 2 * padX, 44, 12); ctx.fillStyle = '#1d1c25'; ctx.fill();
        ctx.textAlign = 'left';
        ctx.fillStyle = '#f4f4f6'; ctx.font = '600 17px "Space Grotesk", sans-serif';
        const fromW = ctx.measureText(t.from).width;
        ctx.fillText(t.from, padX + 18, cy);
        ctx.fillStyle = '#c2f24a'; ctx.fillText('→', padX + 18 + fromW + 12, cy);
        const arrW = ctx.measureText('→').width;
        ctx.fillStyle = '#f4f4f6'; ctx.fillText(t.to, padX + 18 + fromW + 12 + arrW + 12, cy);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#c2f24a'; ctx.font = '700 17px "Space Mono", monospace';
        ctx.fillText(C.fmt(t.amount), W - padX - 18, cy);
      });
    }
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#8c8b98'; ctx.font = '500 12px "Space Grotesk", sans-serif';
    ctx.fillText('Todos confirmaron ✓ · a pagar', padX, H - 30);
    cv.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], 'para-quedar-en-paz.png', { type: 'image/png' });
      // Celular (pantalla táctil) → menú nativo de compartir (WhatsApp, etc.).
      // Computador (mouse) → descarga directa del PNG: el menú de compartir de
      // escritorio (Windows) es confuso y casi sin apps; mejor bajar el archivo.
      const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
      if (coarse && navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: 'Para quedar en paz' }); return; }
        catch (e) { if (e && e.name === 'AbortError') return; } // canceló a propósito
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'para-quedar-en-paz.png';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }, 'image/png');
  }

  /* ---------- eventos (delegación en #app, sobrevive a los re-render) ---------- */
  root.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-act]');
    if (!el || el.tagName === 'INPUT' || el.tagName === 'SELECT') return;
    const act = el.dataset.act, exp = el.dataset.exp, id = el.dataset.id;
    switch (act) {
      case 'view': C.setView(el.dataset.view); break;
      case 'yoPick': yoId = id; render(); break;
      case 'yoClear': yoId = null; render(); break;
      case 'share': onShare(); break;
      case 'confirm': C.toggleConfirm(id); break;
      case 'downloadSettlement': downloadSettlement(); break;
      case 'clear': if (confirm('¿Vaciar todo? Se borran todas las personas y gastos.')) C.clearAll(); break;
      case 'addPerson': C.addPerson(); break;
      case 'removePerson': if (confirm('¿Quitar a esta persona? Se borran sus chulos.')) C.removePerson(id); break;
      case 'addExpense': openExpenseForm(null); break;
      case 'editExpense': openExpenseForm(exp); break;
      case 'removeExpense': C.removeExpense(exp); break;
      case 'toggle': C.toggleParticipation(exp, el.dataset.person); break;
      case 'all': C.setAll(exp); break;
      case 'none': C.setNone(exp); break;
      case 'recPrev': recPrev(); recStart(); break; // navegar resetea el temporizador
      case 'recNext': recNext(); recStart(); break;
      case 'recGo': recShow(Number(el.dataset.i)); recStart(); break;
      case 'recDelete': if (confirm('¿Borrar esta foto?')) C.removeMemory(id); break;
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
      case 'memoryCaption':
        C.setMemoryCaption(el.dataset.id, v, true); // silent: no redibuja al escribir
        field({ op: 'memoryCaption', id: el.dataset.id, value: v });
        break;
    }
  });
  root.addEventListener('change', (ev) => {
    const el = ev.target.closest('[data-act]');
    if (!el) return;
    // El pagador es una acción discreta → mutación normal (redibuja + sincroniza).
    if (el.dataset.act === 'payer') { C.updateExpense(el.dataset.exp, { payerId: el.value }); return; }
    // Al confirmar un valor (blur/Enter), refrescamos los cálculos.
    if (el.dataset.act === 'valor') render();
    // Subir fotos a Recuerdos (input file). Limpiamos el value para poder re-subir la misma.
    if (el.dataset.act === 'recFile') { const f = el.files; el.value = ''; handlePhotoFiles(f); }
  });
  root.addEventListener('keydown', (ev) => {
    const el = ev.target.closest('[data-act]');
    if (el && el.dataset.act === 'newPerson' && ev.key === 'Enter') C.addPerson();
  });

  window.addEventListener('cuentas:changed', render);        // cambios locales estructurales
  window.addEventListener('cuentas:remote-applied', render); // estado bajado del servidor
  render();
})();
