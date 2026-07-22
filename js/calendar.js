// ================================================
// calendar.js — Calendar / Agenda Page
// ================================================

let calendarDate = new Date();
let calendarView = 'month'; // 'month' | 'week' | 'day'
let calendarEvents = [];

async function renderCalendar() {
    const page = document.getElementById('page-calendar');
    page.innerHTML = `
    <div class="page-header">
      <div><h1>Agenda</h1><p>Seus agendamentos e compromissos</p></div>
      <button class="btn-primary" onclick="openEventModal()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Novo Agendamento
      </button>
    </div>
    <div class="calendar-container">
      <div class="calendar-header">
        <div class="calendar-nav">
          <button class="cal-nav-btn" id="calPrev" onclick="calNav(-1)">‹</button>
          <h2 id="calTitle" style="font-size:16px;font-weight:700;min-width:180px;text-align:center">—</h2>
          <button class="cal-nav-btn" id="calNext" onclick="calNav(1)">›</button>
        </div>
        <div class="view-tabs">
          ${['month', 'week', 'day'].map(v =>
        `<button class="view-tab ${v === calendarView ? 'active' : ''}" onclick="setCalView('${v}')">${{ month: 'Mês', week: 'Semana', day: 'Dia' }[v]}</button>`
    ).join('')}
        </div>
        <button class="btn-secondary btn-sm" onclick="goToToday()">Hoje</button>
      </div>
      <div id="calendarBody" class="calendar-body">
        <div style="text-align:center;padding:60px;color:var(--text-muted)">Carregando agenda...</div>
      </div>
    </div>`;
    await loadCalendar();
}

async function loadCalendar() {
    try {
        const [y, m] = [calendarDate.getFullYear(), calendarDate.getMonth() + 1];
        calendarEvents = await DB.getEventsForMonth(y, m);
        drawCalendar();
        // update badge
        const today = new Date().toISOString().split('T')[0];
        const todayEvs = calendarEvents.filter(e => e.event_date === today).length;
        const badge = document.getElementById('badge-calendar');
        if (badge) badge.textContent = todayEvs || '';
    } catch (e) {
        showToast('Erro ao carregar agenda', 'error');
    }
}

function drawCalendar() {
    const title = document.getElementById('calTitle');
    const body = document.getElementById('calendarBody');
    if (!body) return;

    if (calendarView === 'month') {
        title.textContent = calendarDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        body.innerHTML = buildMonthView();
    } else if (calendarView === 'week') {
        title.textContent = 'Semana de ' + getWeekStart().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
        body.innerHTML = buildWeekView();
    } else {
        title.textContent = calendarDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
        body.innerHTML = buildDayView();
    }
}

// ----------- MONTH VIEW -----------
function buildMonthView() {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();

    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    let html = `<div class="cal-month">
    <div class="cal-weekdays">${weekDays.map(d => `<div class="cal-weekday">${d}</div>`).join('')}</div>
    <div class="cal-days">`;

    // prev month days
    for (let i = firstDay - 1; i >= 0; i--) {
        html += `<div class="cal-day other-month"><span class="day-num">${prevDays - i}</span></div>`;
    }

    // current month days
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayEvs = calendarEvents.filter(e => e.event_date === dateStr);
        const isToday = dateStr === todayStr;

        html += `<div class="cal-day${isToday ? ' today' : ''}" onclick="openEventModal(null,'${dateStr}')">
      <span class="day-num ${isToday ? 'today-badge' : ''}">${d}</span>
      <div class="day-events">
        ${dayEvs.slice(0, 3).map(ev => buildEventChip(ev)).join('')}
        ${dayEvs.length > 3 ? `<div class="event-chip more">+${dayEvs.length - 3} mais</div>` : ''}
      </div>
    </div>`;
    }

    // next month days
    const remaining = 42 - (firstDay + daysInMonth);
    for (let d = 1; d <= remaining; d++) {
        html += `<div class="cal-day other-month"><span class="day-num">${d}</span></div>`;
    }

    html += `</div></div>`;
    return html;
}

function buildEventChip(ev) {
    const colors = { consulta: '#6366f1', reuniao: '#06b6d4', ligacao: '#10b981', followup: '#f59e0b', outro: '#6b7280' };
    const color = colors[ev.event_type] || '#6366f1';
    return `<div class="event-chip" style="background:${color}20;color:${color};border-left:2px solid ${color}"
    onclick="event.stopPropagation();showEventDetail('${ev.id}')"
    title="${ev.title}${ev.start_time ? ' · ' + fmtTime(ev.start_time) : ''}">
    ${ev.start_time ? `<span style="opacity:.7;font-size:9px">${fmtTime(ev.start_time)}</span> ` : ''}
    ${ev.title}
  </div>`;
}

// ----------- WEEK VIEW -----------
function getWeekStart() {
    const d = new Date(calendarDate);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    return d;
}

function buildWeekView() {
    const weekStart = getWeekStart();
    const today = new Date().toISOString().split('T')[0];
    const days = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        days.push(d);
    }

    const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7h-20h
    const weekDayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    let html = `<div class="cal-week">
    <div class="week-header">
      <div class="time-col"></div>
      ${days.map(d => {
        const ds = d.toISOString().split('T')[0];
        const isToday = ds === today;
        return `<div class="week-day-header ${isToday ? 'today' : ''}">
          <div class="week-day-name">${weekDayNames[d.getDay()]}</div>
          <div class="week-day-num ${isToday ? 'today-badge' : ''}">${d.getDate()}</div>
        </div>`;
    }).join('')}
    </div>
    <div class="week-body">
      ${hours.map(h => `
        <div class="week-row">
          <div class="time-col">${String(h).padStart(2, '0')}:00</div>
          ${days.map(d => {
        const ds = d.toISOString().split('T')[0];
        const slotEvs = calendarEvents.filter(e => {
            if (e.event_date !== ds) return false;
            if (!e.start_time) return false;
            const eHour = parseInt(e.start_time);
            return eHour === h;
        });
        return `<div class="week-cell" onclick="openEventModal(null,'${ds}')">
              ${slotEvs.map(ev => buildEventChip(ev)).join('')}
            </div>`;
    }).join('')}
        </div>`).join('')}
    </div>
  </div>`;
    return html;
}

// ----------- DAY VIEW -----------
function buildDayView() {
    const ds = calendarDate.toISOString().split('T')[0];
    const dayEvs = calendarEvents.filter(e => e.event_date === ds);
    const hours = Array.from({ length: 17 }, (_, i) => i + 6); // 6h-22h

    let html = `<div class="cal-day-view">
    <div class="day-view-list">`;

    if (dayEvs.length) {
        // Sort by time
        const sorted = [...dayEvs].sort((a, b) => (a.start_time || '00:00').localeCompare(b.start_time || '00:00'));
        const colors = { consulta: '#6366f1', reuniao: '#06b6d4', ligacao: '#10b981', followup: '#f59e0b', outro: '#6b7280' };
        html += sorted.map(ev => `
      <div class="day-event-item" onclick="showEventDetail('${ev.id}')">
        <div class="day-event-time">
          ${ev.start_time ? fmtTime(ev.start_time) : '--:--'}
          ${ev.end_time ? `<br><span style="opacity:.5">até ${fmtTime(ev.end_time)}</span>` : ''}
        </div>
        <div class="day-event-bar" style="background:${colors[ev.event_type] || '#6366f1'}"></div>
        <div class="day-event-body">
          <div class="day-event-title">${ev.title}</div>
          <div class="day-event-meta">
            ${ev.crm_contacts?.name ? `👤 ${ev.crm_contacts.name} ·` : ''} 
            ${eventTypeLabel(ev.event_type)}
            ${ev.completed ? ' · <span style="color:var(--success)">✓ Concluído</span>' : ''}
          </div>
          ${ev.notes ? `<p style="margin-top:4px;font-size:11px;color:var(--text-muted)">${ev.notes}</p>` : ''}
        </div>
        <div class="day-event-actions">
          <button class="action-btn" onclick="event.stopPropagation();openEventModal(${JSON.stringify(ev).replace(/"/g, '&quot;')})">Editar</button>
          <button class="action-btn danger" onclick="event.stopPropagation();deleteEvent('${ev.id}')">Excluir</button>
        </div>
      </div>`).join('');
    } else {
        html += `<div class="empty-state" style="padding:60px 0">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      <p>Nenhum agendamento neste dia</p>
      <button class="btn-primary btn-sm" onclick="openEventModal(null,'${ds}')">Agendar</button>
    </div>`;
    }

    html += `</div></div>`;
    return html;
}

// ----------- Controls -----------
function calNav(dir) {
    if (calendarView === 'month') {
        calendarDate.setMonth(calendarDate.getMonth() + dir);
    } else if (calendarView === 'week') {
        calendarDate.setDate(calendarDate.getDate() + dir * 7);
    } else {
        calendarDate.setDate(calendarDate.getDate() + dir);
    }
    loadCalendar();
}

function setCalView(v) {
    calendarView = v;
    document.querySelectorAll('.view-tab').forEach(btn =>
        btn.classList.toggle('active', btn.textContent === { month: 'Mês', week: 'Semana', day: 'Dia' }[v]));
    loadCalendar();
}

function goToToday() {
    calendarDate = new Date();
    loadCalendar();
}

async function showEventDetail(id) {
    try {
        const { data: ev } = await supabase.from('crm_events').select('*, crm_contacts(name, phone)').eq('id', id).single();
        if (!ev) return;

        const colors = { consulta: '#6366f1', reuniao: '#06b6d4', ligacao: '#10b981', followup: '#f59e0b', outro: '#6b7280' };
        const color = colors[ev.event_type] || '#6366f1';

        const body = document.createElement('div');
        body.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)';
        body.innerHTML = `
      <div style="background:var(--bg-elevated);border-radius:16px;padding:28px;max-width:420px;width:90%;position:relative">
        <button onclick="this.closest('div[style]').remove()" style="position:absolute;top:16px;right:16px;background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:20px">✕</button>
        <div style="border-left:4px solid ${color};padding-left:16px;margin-bottom:20px">
          <div style="font-size:11px;color:${color};font-weight:600;margin-bottom:4px">${eventTypeLabel(ev.event_type)}</div>
          <h3 style="font-size:18px;font-weight:700;margin-bottom:6px">${ev.title}</h3>
          <div style="font-size:13px;color:var(--text-secondary)">${fmtDate(ev.event_date)}${ev.start_time ? ' · ' + fmtTime(ev.start_time) : ''}${ev.end_time ? ' – ' + fmtTime(ev.end_time) : ''}</div>
        </div>
        ${ev.crm_contacts ? `<div style="background:var(--bg-surface);border-radius:10px;padding:12px;margin-bottom:12px;display:flex;align-items:center;gap:12px">
          <div class="contact-avatar sm">${initials(ev.crm_contacts.name)}</div>
          <div><div style="font-size:13px;font-weight:600">${ev.crm_contacts.name}</div>${ev.crm_contacts.phone ? `<div style="font-size:11px;color:var(--text-muted)">${ev.crm_contacts.phone}</div>` : ''}</div>
        </div>` : ''}
        ${ev.notes ? `<p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">${ev.notes}</p>` : ''}
        <div style="display:flex;gap:8px;justify-content:flex-end">
          ${!ev.completed ? `<button class="btn-secondary btn-sm" onclick="completeEvent('${ev.id}');this.closest('div[style]').remove()">✓ Concluir</button>` : ''}
          <button class="btn-primary btn-sm" onclick="this.closest('div[style]').remove();openEventModal(${JSON.stringify(ev).replace(/"/g, '&quot;')})">Editar</button>
          <button class="action-btn danger" onclick="deleteEvent('${ev.id}');this.closest('div[style]').remove()">Excluir</button>
        </div>
      </div>`;
        document.body.appendChild(body);
        body.addEventListener('click', e => { if (e.target === body) body.remove(); });
    } catch (e) { console.error(e); }
}

async function completeEvent(id) {
    try {
        await DB.updateEvent(id, { completed: true });
        showToast('Agendamento concluído!', 'success');
        loadCalendar();
    } catch (e) { showToast('Erro ao atualizar', 'error'); }
}

async function deleteEvent(id) {
    if (!confirm('Excluir este agendamento?')) return;
    try {
        await DB.deleteEvent(id);
        showToast('Agendamento removido', 'success');
        loadCalendar();
    } catch (e) { showToast('Erro ao excluir', 'error'); }
}

// Save event
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('saveEventBtn').addEventListener('click', async () => {
        const id = document.getElementById('event-id').value;
        const title = document.getElementById('event-title').value.trim();
        const date = document.getElementById('event-date').value;
        if (!title) { showToast('Título é obrigatório', 'error'); return; }
        if (!date) { showToast('Data é obrigatória', 'error'); return; }

        const payload = {
            title,
            event_date: date,
            event_type: document.getElementById('event-type').value,
            start_time: document.getElementById('event-start').value || null,
            end_time: document.getElementById('event-end').value || null,
            contact_id: document.getElementById('event-contact').value || null,
            notes: document.getElementById('event-notes').value.trim() || null,
        };

        try {
            if (id) { await DB.updateEvent(id, payload); showToast('Agendamento atualizado!', 'success'); }
            else { await DB.createEvent(payload); showToast('Agendamento criado!', 'success'); }
            closeModal('eventModal');
            if (document.getElementById('page-calendar').classList.contains('active')) loadCalendar();
        } catch (e) { showToast('Erro: ' + e.message, 'error'); }
    });
});
