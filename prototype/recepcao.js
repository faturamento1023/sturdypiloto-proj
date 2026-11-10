'use strict';

const $ = id => document.getElementById(id);
const initialDay = '2026-11-10';
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', timeZone: 'UTC' });
const isoDay = date => date.toISOString().slice(0, 10);
const brDate = date => date ? date.split('-').reverse().join('/') : '—';
const moveDay = (day, offset) => isoDay(new Date(Date.parse(day + 'T00:00:00Z') + offset * 86400000));
const clean = value => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

const doctors = [
  { id: 'clinica', label: 'Clínica Geral · Dra. Marina', name: 'Dra. Marina Lima' },
  { id: 'imagem', label: 'Ultrassonografia · Dr. Rafael', name: 'Dr. Rafael Mendes' },
];
const procedures = [
  { id: 'consulta', name: 'Consulta clínica', price: 30000 },
  { id: 'usg', name: 'USG de abdome total', price: 22000 },
  { id: 'retorno', name: 'Consulta de retorno', price: 15000 },
  { id: 'usg-t', name: 'USG transvaginal', price: 25000 },
];
const patients = [
  { id: 1001, name: 'Ana Moreira', birth: '1988-04-12' },
  { id: 1002, name: 'Bruno Martins', birth: '1976-09-23' },
  { id: 1003, name: 'Carla Almeida', birth: '1992-02-03' },
  { id: 1004, name: 'Diego Castro', birth: '1981-12-14' },
  { id: 1005, name: 'Elisa Nunes', birth: '1968-07-19' },
  { id: 1006, name: 'Fernanda Lopes', birth: '1997-08-25' },
  { id: 1007, name: 'Gustavo Rocha', birth: '1990-03-27' },
].map(p => ({ ...p, phone: '(00) 90000-' + p.id, email: 'paciente' + p.id + '@example.com' }));

const bookings = [
  [1001, '08:00', 'clinica', 'consulta', 'Particular', 'Em atendimento'],
  [1002, '08:30', 'imagem', 'usg', 'Convênio Demo', 'Confirmado'],
  [1003, '09:00', 'clinica', 'retorno', 'Particular', 'Reservado'],
  [1004, '09:30', 'imagem', 'usg', 'Particular', 'Reservado'],
  [1005, '10:00', 'clinica', 'consulta', 'Convênio Demo', 'Cancelado'],
  [1006, '10:30', 'imagem', 'usg-t', 'Particular', 'Reservado'],
  [1007, '11:00', 'clinica', 'consulta', 'Particular', 'Reservado'],
].map(([patient, time, doctor, procedure, plan, status], index) => ({ id: index + 1, date: initialDay, patient, time, doctor, procedure, plan, status }));
const encounters = [
  { id: 241, date: initialDay, patient: 1001, plan: 'Particular', status: 'Concluído',
    items: [{ procedure: 'consulta', doctor: 'clinica', qty: 1, price: 30000, charge: 30000 }],
    payments: [{ method: 'Pix', value: 30000 }] },
];
bookings[0].encounter = encounters[0].id;
const statusClass = { Livre: 'livre', Reservado: 'reservado', Confirmado: 'confirmado', 'Em atendimento': 'atendimento', Cancelado: 'cancelado', Concluído: 'confirmado' };
const findPatient = id => patients.find(p => p.id === id);
const findDoctor = id => doctors.find(d => d.id === id);
const findProcedure = id => procedures.find(p => p.id === id);
const modules = ['agenda', 'grade', 'atendimentos', 'historico', 'pacientes', 'novo'];
const sharedViews = ['grade', 'historico'];
const smallScreen = matchMedia('(max-width: 680px)');
let selectedDay = initialDay;
let nextBooking = bookings.length + 1;
let nextPatient = 1008;
let nextEncounter = 242;
let draft;
let agendaFilters = { query: '', period: 'day', status: '' };
let attendanceQuery = '';

function node(tag, label = '', css = '') {
  const element = document.createElement(tag);
  element.textContent = label;
  if (css) element.className = css;
  return element;
}
function button(label, color, action) {
  const element = node('button', label, 'btn small ' + color);
  element.type = 'button';
  element.addEventListener('click', action);
  return element;
}
function fieldOption(value, label) {
  return new Option(label, String(value));
}
function setOptions(id, entries, label, placeholder) {
  $(id).replaceChildren(...(placeholder ? [fieldOption('', placeholder)] : []), ...entries.map(e => fieldOption(e.id, e[label])));
}
function row(tbody, values) {
  const tr = node('tr');
  for (const value of values) {
    const cell = node('td');
    cell.append(value instanceof Node ? value : document.createTextNode(String(value)));
    tr.append(cell);
  }
  tbody.append(tr);
}
function empty(tbody, columns, message) {
  const tr = node('tr');
  const td = node('td', message, 'empty');
  td.colSpan = columns;
  tr.append(td);
  tbody.append(tr);
}
function notice(message = '') {
  $('notice').textContent = message;
  $('notice').hidden = !message;
}
function error(element, message = '') {
  element.textContent = message;
  element.hidden = !message;
}
function badge(status) {
  return node('span', status, 'badge ' + statusClass[status]);
}
function group(...buttons) {
  const div = node('div', '', 'row-actions');
  div.append(...buttons);
  return div;
}
function show(view) {
  const hash = location.hash.slice(1);
  if (sharedViews.includes(view) || sharedViews.includes(hash)) {
    history.replaceState(null, '', sharedViews.includes(view) ? '#' + view : location.pathname + location.search);
  }
  for (const page of modules) $('view-' + page).hidden = page !== view;
  for (const b of document.querySelectorAll('nav [data-view]')) {
    const current = b.dataset.view === (view === 'novo' ? 'atendimentos' : view);
    if (current) {
      b.setAttribute('aria-current', 'page');
      const group = b.closest('details');
      if (group) group.open = true;
    } else b.removeAttribute('aria-current');
  }
  notice();
  if (smallScreen.matches) setMenu(false);
  const page = $('view-' + view);
  const heading = page.querySelector('h1');
  document.title = heading.textContent + ' · Clínica DM';
  if (view === 'agenda') renderAgenda();
  if (view === 'grade') renderGrade();
  if (view === 'atendimentos') renderEncounters();
  if (view === 'historico') renderHistory();
  if (view === 'pacientes') renderPatients();
  window.scrollTo(0, 0);
}
function setMenu(open) {
  document.querySelector('.shell').classList.toggle('menu-closed', !smallScreen.matches && !open);
  document.querySelector('.shell').classList.toggle('mobile-open', smallScreen.matches && open);
  $('menu-toggle').setAttribute('aria-expanded', String(open));
}

function rangeContains(day) {
  if (agendaFilters.period === 'day') return day === selectedDay;
  const dayOfWeek = new Date(selectedDay + 'T00:00:00Z').getUTCDay();
  const monday = moveDay(selectedDay, -((dayOfWeek + 6) % 7));
  return day >= monday && day < moveDay(monday, 7);
}
function setDate(date) {
  if (!date) return;
  selectedDay = date;
  $('agenda-date').value = date;
  if ($('view-grade').hidden) renderAgenda();
  else renderGrade();
}
function dateLabel() {
  const day = weekday.format(new Date(selectedDay + 'T00:00:00Z'));
  return day.charAt(0).toUpperCase() + day.slice(1) + ' · ' + brDate(selectedDay);
}
function renderAgenda() {
  $('agenda-date-br').textContent = brDate(selectedDay);
  $('agenda-date-label').textContent = dateLabel();
  const filter = $('agenda-selection').value;
  const { status, period } = agendaFilters;
  const query = clean(agendaFilters.query);
  const rows = bookings.filter(b => rangeContains(b.date) && (!filter || b.doctor === filter)
    && (!status || b.status === status)
    && clean(findPatient(b.patient).name + ' ' + findProcedure(b.procedure).name + ' ' + b.plan).includes(query))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const tbody = $('agenda-rows');
  tbody.replaceChildren();
  for (const b of rows) {
    const p = findPatient(b.patient);
    const name = node('div');
    name.append(node('span', p.name, 'row-name'), node('span', findDoctor(b.doctor).name, 'row-meta'));
    const time = node('div', b.time, 'numeric');
    if (period === 'week') time.append(node('span', brDate(b.date), 'row-meta'));
    let actions = b.encounter ? 'AT-' + b.encounter : '—';
    if (['Reservado', 'Confirmado'].includes(b.status)) {
      actions = group(
        button('Atender', 'teal', () => openEncounter(b)),
        ...(b.status === 'Reservado' ? [button('Confirmar', 'neutral', () => { b.status = 'Confirmado'; renderAgenda(); notice('Agendamento confirmado.'); })] : []),
        button('Cancelar', 'red', () => {
          if (!window.confirm('Cancelar o agendamento fictício de ' + p.name + '?')) return;
          b.status = 'Cancelado'; renderAgenda(); notice('Agendamento cancelado.');
        }),
      );
    }
    row(tbody, [time, name, b.plan, p.phone || '—', brDate(p.birth), findProcedure(b.procedure).name, badge(b.status), actions]);
  }
  if (!rows.length) empty(tbody, 8, 'Nenhum agendamento para os filtros selecionados.');
  $('agenda-count').textContent = rows.length === 1 ? '1 agendamento' : rows.length + ' agendamentos';
}
const shift = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00'];
function available(date, doctor, time) {
  const day = new Date(date + 'T00:00:00Z').getUTCDay();
  return day >= 1 && day <= 5 && shift.includes(time)
    && !bookings.some(b => b.date === date && b.doctor === doctor && b.time === time && b.status !== 'Cancelado');
}
function renderGrade() {
  const selection = $('grade-doctor').value;
  const term = clean($('grade-search').value);
  const status = $('grade-status').value;
  const freeOnly = status === 'livres';
  $('grade-date').value = selectedDay;
  $('grade-date-br').textContent = brDate(selectedDay);
  $('grade-date-label').textContent = dateLabel();
  $('grade-free').setAttribute('aria-pressed', String(freeOnly));
  const groups = $('grade-grupos');
  groups.replaceChildren();
  const professionals = doctors.filter(doctor => (!selection || doctor.id === selection) && clean(doctor.name).includes(term));
  for (const doctor of professionals) {
    const section = node('section', '', 'grade-grupo');
    const heading = node('h2', doctor.name);
    heading.id = 'grade-' + doctor.id;
    section.setAttribute('aria-labelledby', heading.id);
    const table = node('table', '', 'grade-table');
    const head = table.createTHead().insertRow();
    for (const label of ['Horário', 'Situação', 'Local']) {
      const cell = node('th', label);
      cell.scope = 'col';
      head.append(cell);
    }
    const rows = bookings.filter(b => b.date === selectedDay && b.doctor === doctor.id);
    const slots = shift.filter(time => available(selectedDay, doctor.id, time)).map(time => ({ time, status: 'Livre' }));
    const items = [...rows, ...slots].filter(item => {
      if (freeOnly) return item.status === 'Livre';
      if (status === 'cancelados') return item.status === 'Cancelado';
      if (status === 'ocupados') return item.status !== 'Livre' && item.status !== 'Cancelado';
      return true;
    }).sort((a, b) => a.time.localeCompare(b.time));
    const tbody = table.createTBody();
    for (const item of items) row(tbody, [item.time, badge(item.status), item.status === 'Livre' ? 'Clínica DM · Demo' : '—']);
    if (!items.length) empty(tbody, 3, 'Nenhum horário para os filtros selecionados.');
    const wrap = node('div', '', 'table-box');
    wrap.append(table);
    section.append(heading, wrap);
    groups.append(section);
  }
  if (!professionals.length) groups.append(node('p', 'Nenhum profissional encontrado.', 'muted'));
}
function freeSlots() {
  const result = $('free-rows');
  result.replaceChildren();
  const until = moveDay(selectedDay, 7);
  $('free-date').textContent = 'Agendamentos livres até ' + brDate(until);
  const selected = $('agenda-selection').value;
  const schedules = doctors.filter(doctor => !selected || doctor.id === selected);
  for (let offset = 0; offset <= 7; offset += 1) {
    const date = moveDay(selectedDay, offset);
    const slots = schedules.flatMap(doctor => shift.filter(time => available(date, doctor.id, time)).map(time => ({ doctor, time })));
    if (!slots.length) continue;
    const day = node('details', '', 'free-day');
    day.open = !result.childElementCount;
    day.append(node('summary', brDate(date) + ' · ' + slots.length + ' vagas'));
    for (const { doctor, time } of slots) {
      const item = node('div', '', 'dialog-list-row');
      item.append(node('span', time + ' · ' + doctor.name), button('Reservar', 'teal', () => {
        $('free-dialog').close();
        openBooking(doctor.id, time, date);
      }));
      day.append(item);
    }
    result.append(day);
  }
  if (!result.childElementCount) result.append(node('p', 'Sem horários livres para o período e a agenda selecionados.', 'muted'));
  $('free-dialog').showModal();
}
function openBooking(doctor = $('agenda-selection').value || doctors[0].id, time = '', date = selectedDay) {
  $('booking-form').reset();
  setOptions('booking-patient', patients, 'name', 'Selecione');
  $('booking-doctor').value = doctor;
  $('booking-date').value = date;
  $('booking-time').value = time;
  error($('booking-form').querySelector('.form-error'));
  $('booking-dialog').showModal();
}
$('booking-form').addEventListener('submit', event => {
  event.preventDefault();
  const date = $('booking-date').value;
  const doctor = $('booking-doctor').value;
  const time = $('booking-time').value;
  if (!available(date, doctor, time)) {
    error($('booking-form').querySelector('.form-error'), 'Horário indisponível. Consulte Horários Livres para escolher outra opção.');
    return;
  }
  bookings.push({ id: nextBooking++, date, doctor, time, patient: Number($('booking-patient').value),
    plan: $('booking-plan').value, procedure: $('booking-procedure').value, status: 'Reservado' });
  $('booking-dialog').close();
  $('agenda-selection').value = doctor;
  agendaFilters = { ...agendaFilters, query: '', status: '' };
  setDate(date);
  notice('Agendamento reservado. A abertura do atendimento é feita na ação Atender.');
});

function sum(items, value) {
  return items.reduce((total, item) => total + value(item), 0);
}
function amounts(entry) {
  return [sum(entry.items, i => i.price * i.qty), sum(entry.items, i => i.charge), sum(entry.payments, p => p.value)];
}
function renderHistory() {
  const term = clean($('history-search').value);
  const tbody = $('history-rows');
  tbody.replaceChildren();
  for (const entry of [...encounters].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)) {
    for (const item of entry.items) {
      const procedure = findProcedure(item.procedure);
      const professional = findDoctor(item.doctor).name;
      if (!clean([procedure.name, procedure.id, professional].join(' ')).includes(term)) continue;
      const description = node('div', procedure.name, 'row-name');
      description.append(node('span', procedure.id.toUpperCase(), 'row-meta'));
      row(tbody, [brDate(entry.date), description, professional, item.qty,
        money.format(item.price / 100), money.format(item.charge / 100)]);
    }
  }
  if (!tbody.childElementCount) empty(tbody, 6, 'Nenhum item encontrado no histórico.');
}
function renderEncounters() {
  const from = $('attendance-date').value || initialDay;
  const range = $('attendance-period').value === 'range';
  const end = $('attendance-end');
  end.min = from;
  if (end.value < from) end.value = from;
  $('attendance-end-field').hidden = !range;
  const to = range ? end.value : from;
  const query = clean(attendanceQuery);
  const records = encounters.filter(e => e.date >= from && e.date <= to &&
    clean(`DEMO-${e.id} AT-${e.id} ${findPatient(e.patient).name}`).includes(query));
  $('attendance-totals').replaceChildren(...[
    ['ATENDIMENTOS', records.length, 'case'],
    ['PROCEDIMENTOS', sum(records, e => sum(e.items, i => i.qty)), 'document'],
    ['VALOR PAGO (CAIXA)', money.format(sum(records, e => amounts(e)[2]) / 100), 'money'],
    ['VLR TOTAL', money.format(sum(records, e => amounts(e)[1]) / 100), 'list'],
  ].map(([label, value, icon]) => {
    const card = node('div', '', 'total-card');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    svg.setAttribute('aria-hidden', 'true');
    use.setAttribute('href', '#' + icon);
    svg.append(use);
    card.append(node('span', label), node('strong', String(value)), svg);
    return card;
  }));
  const tbody = $('attendance-rows');
  tbody.replaceChildren();
  for (const e of records) row(tbody, ['DEMO-' + e.id, 'AT-' + e.id, brDate(e.date), findPatient(e.patient).name, e.plan, e.items.length,
    badge(e.status), ...amounts(e).map(cents => money.format(cents / 100)),
    button('Ver itens', 'neutral', () => notice(e.items.map(i => findProcedure(i.procedure).name + ' · ' + i.qty + ' item(ns)').join(' | '))),
  ]);
  if (!records.length) empty(tbody, 11, 'Nenhum atendimento encontrado.');
}
function fillPatient(p) {
  draft.patient = p?.id;
  $('record-patient').value = p?.id ?? '';
  $('record-name').value = p?.name ?? '';
  $('record-birth').value = p ? brDate(p.birth) : '';
}
function openEncounter(booking, patient) {
  draft = { booking, items: [], payments: [] };
  $('attendance-form').reset();
  $('record-number').value = 'Gerado ao salvar';
  $('record-plan').value = booking?.plan ?? 'Particular';
  $('record-date').value = booking?.date ?? ($('attendance-date').value || selectedDay);
  $('attendance-origin').textContent = booking ? 'Origem · Agendamento #' + booking.id : 'Recepção';
  if (booking) {
    $('item-procedure').value = booking.procedure;
    $('item-doctor').value = booking.doctor;
  }
  fillPatient(patient ?? (booking && findPatient(booking.patient)));
  error($('attendance-error'));
  updatePrice();
  renderDraft();
  show('novo');
}
function renderDraft() {
  const items = $('item-rows');
  const payments = $('payment-rows');
  items.replaceChildren();
  payments.replaceChildren();
  for (const [idx, i] of draft.items.entries()) row(items, [findProcedure(i.procedure).name, findDoctor(i.doctor).name, i.qty,
    money.format(i.price / 100), money.format(i.charge / 100), button('Remover', 'red', () => { draft.items.splice(idx, 1); renderDraft(); })]);
  for (const [idx, p] of draft.payments.entries()) row(payments, [p.method, money.format(p.value / 100),
    button('Remover', 'red', () => { draft.payments.splice(idx, 1); renderDraft(); })]);
  if (!draft.items.length) empty(items, 6, 'Nenhum procedimento adicionado.');
  if (!draft.payments.length) empty(payments, 3, 'Nenhum pagamento adicionado.');
  $('item-total').textContent = 'Total de procedimentos · ' + money.format(amounts(draft)[1] / 100);
  $('payment-total').textContent = 'Total de pagamentos · ' + money.format(amounts(draft)[2] / 100);
}
function updatePrice() {
  $('item-list-value').textContent = money.format((findProcedure($('item-procedure').value)?.price ?? 0) / 100);
  $('item-charge').value = '';
}
function renderPatientChoices() {
  const result = $('choose-rows');
  result.replaceChildren();
  const term = clean($('choose-search').value);
  for (const p of patients.filter(item => clean(item.name + ' ' + item.id).includes(term))) {
    const r = node('div', '', 'dialog-list-row');
    r.append(node('span', p.id + ' · ' + p.name), button('Escolher', 'teal', () => { fillPatient(p); $('choose-dialog').close(); }));
    result.append(r);
  }
  if (!result.childElementCount) result.append(node('p', 'Nenhum paciente encontrado.', 'muted'));
}
function renderPatients() {
  const term = clean($('patient-search').value);
  const tbody = $('patient-rows');
  tbody.replaceChildren();
  for (const p of patients.filter(item => clean(item.name + ' ' + item.id).includes(term))) row(tbody,
    [p.id, node('span', p.name, 'row-name'), brDate(p.birth), p.email || '—', p.phone || '—', '—',
      button('Novo atendimento', 'teal', () => openEncounter(null, p))]);
  if (!tbody.childElementCount) empty(tbody, 7, 'Nenhum paciente encontrado.');
}

document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => show(b.dataset.view)));
document.querySelectorAll('[data-dismiss]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
document.querySelectorAll('[data-open-search]').forEach(b => b.addEventListener('click', () => {
  const name = b.dataset.openSearch;
  if (name === 'agenda') {
    $('agenda-search').value = agendaFilters.query;
    $('period').value = agendaFilters.period;
    $('status').value = agendaFilters.status;
  } else $('attendance-search').value = attendanceQuery;
  $(name + '-search-dialog').showModal();
}));
$('agenda-search-form').addEventListener('submit', event => {
  event.preventDefault();
  agendaFilters = { query: $('agenda-search').value, period: $('period').value, status: $('status').value };
  $('agenda-search-dialog').close();
  renderAgenda();
});
$('attendance-search-form').addEventListener('submit', event => {
  event.preventDefault();
  attendanceQuery = $('attendance-search').value;
  $('attendance-search-dialog').close();
  renderEncounters();
});
document.querySelectorAll('[data-print]').forEach(b => b.addEventListener('click', () => window.print()));
$('menu-toggle').addEventListener('click', event => setMenu(event.currentTarget.getAttribute('aria-expanded') !== 'true'));
smallScreen.addEventListener('change', event => setMenu(!event.matches));
$('agenda-date').addEventListener('change', event => setDate(event.currentTarget.value));
$('prev-day').addEventListener('click', () => setDate(moveDay(selectedDay, -1)));
$('next-day').addEventListener('click', () => setDate(moveDay(selectedDay, 1)));
$('grade-date').addEventListener('change', event => setDate(event.currentTarget.value));
$('grade-prev').addEventListener('click', () => setDate(moveDay(selectedDay, -1)));
$('grade-next').addEventListener('click', () => setDate(moveDay(selectedDay, 1)));
$('grade-free').addEventListener('click', () => {
  $('grade-status').value = $('grade-status').value === 'livres' ? 'todos' : 'livres';
  renderGrade();
});
for (const id of ['grade-doctor', 'grade-status']) $(id).addEventListener('change', renderGrade);
$('grade-search').addEventListener('input', renderGrade);
$('history-search').addEventListener('input', renderHistory);
$('free').addEventListener('click', freeSlots);
$('free-grade').addEventListener('click', () => { $('free-dialog').close(); show('grade'); });
$('refresh').addEventListener('click', () => { renderAgenda(); notice('Agenda atualizada nesta demonstração.'); });
$('attendance-refresh').addEventListener('click', () => { renderEncounters(); notice('Atendimentos atualizados nesta demonstração.'); });
$('new-booking').addEventListener('click', () => openBooking());
$('new-attendance').addEventListener('click', () => openEncounter());
$('choose-patient').addEventListener('click', () => { $('choose-search').value = ''; renderPatientChoices(); $('choose-dialog').showModal(); });
$('choose-search').addEventListener('input', renderPatientChoices);
$('item-procedure').addEventListener('change', updatePrice);
$('add-item').addEventListener('click', () => {
  const procedure = findProcedure($('item-procedure').value);
  const doctor = $('item-doctor').value;
  const qty = Number($('item-quantity').value);
  const raw = $('item-charge').value;
  if (!procedure || !doctor || !Number.isInteger(qty) || qty < 1 || qty > 20 || (raw && !/^[0-9]+(\.[0-9]{1,2})?$/.test(raw))) {
    error($('attendance-error'), 'Escolha procedimento e médico e confira a quantidade e o valor cobrado.');
    return;
  }
  draft.items.push({ procedure: procedure.id, doctor, qty, price: procedure.price,
    charge: raw ? Math.round(Number(raw) * 100) : procedure.price * qty });
  error($('attendance-error'));
  $('item-quantity').value = '1';
  updatePrice();
  renderDraft();
});
$('add-payment').addEventListener('click', () => {
  const value = Number($('payment-value').value);
  if (!Number.isFinite(value) || value <= 0 || !$('payment-value').validity.valid) {
    error($('attendance-error'), 'Informe um valor de pagamento válido.');
    return;
  }
  draft.payments.push({ method: $('payment-method').value, value: Math.round(value * 100) });
  $('payment-value').value = '';
  error($('attendance-error'));
  renderDraft();
});
$('attendance-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!draft.patient || !draft.items.length) {
    error($('attendance-error'), 'Escolha o paciente e adicione ao menos um procedimento.');
    return;
  }
  const id = nextEncounter++;
  const date = $('record-date').value;
  encounters.push({ id, date, patient: draft.patient, plan: $('record-plan').value, status: 'Em atendimento',
    items: draft.items, payments: draft.payments, note: $('record-note').value, invoice: $('record-invoice').checked,
    membership: $('record-membership').value, authorization: $('record-authorization').value, guide: $('record-guide').value,
    code: $('record-code').value, requester: $('request-name').value, crm: $('request-crm').value, uf: $('request-uf').value });
  if (draft.booking) {
    draft.booking.status = 'Em atendimento';
    draft.booking.encounter = id;
  }
  $('attendance-date').value = date;
  attendanceQuery = '';
  show('atendimentos');
  notice('Atendimento fictício AT-' + id + ' registrado nesta prévia.');
});
$('new-patient').addEventListener('click', () => { $('patient-form').reset(); $('patient-dialog').showModal(); });
$('patient-form').addEventListener('submit', event => {
  event.preventDefault();
  const name = $('patient-name').value.trim();
  if (!name) { $('patient-name').focus(); return; }
  patients.push({ id: nextPatient++, name, birth: $('patient-birth').value, phone: $('patient-phone').value.trim(), email: $('patient-email').value.trim() });
  $('patient-dialog').close();
  $('patient-search').value = name;
  renderPatients();
  notice('Paciente fictício cadastrado nesta prévia.');
});
$('patient-search-form').addEventListener('submit', event => { event.preventDefault(); renderPatients(); });
$('agenda-selection').addEventListener('change', renderAgenda);
for (const id of ['attendance-period', 'attendance-date', 'attendance-end']) $(id).addEventListener('change', renderEncounters);
$('patient-search').addEventListener('input', renderPatients);

setOptions('agenda-selection', doctors, 'label', 'Todas as agendas');
setOptions('grade-doctor', doctors, 'name', 'Todos os profissionais');
setOptions('booking-doctor', doctors, 'label');
setOptions('booking-procedure', procedures, 'name');
setOptions('item-procedure', procedures, 'name', 'Escolha');
setOptions('item-doctor', doctors, 'name', 'Escolha');
$('agenda-date').value = initialDay;
$('attendance-date').value = initialDay;
$('attendance-end').value = initialDay;
setMenu(!smallScreen.matches);
const initialView = location.hash.slice(1);
show(sharedViews.includes(initialView) ? initialView : 'agenda');
window.addEventListener('hashchange', () => {
  const view = location.hash.slice(1);
  if (sharedViews.includes(view)) show(view);
});
