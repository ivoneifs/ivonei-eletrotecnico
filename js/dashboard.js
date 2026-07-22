// ================================================
// dashboard.js — Dashboard Page
// ================================================

async function renderDashboard() {
    const page = document.getElementById('page-dashboard');
    page.innerHTML = `<div class="page-header"><div><h1>Dashboard</h1><p>Visão geral do seu CRM</p></div></div>
    <div class="stats-grid" id="statsGrid"><div class="skeleton" style="height:110px;border-radius:16px"></div><div class="skeleton" style="height:110px;border-radius:16px"></div><div class="skeleton" style="height:110px;border-radius:16px"></div><div class="skeleton" style="height:110px;border-radius:16px"></div></div>
    <div class="dashboard-grid">
      <div class="card"><div class="card-header"><h3>Pipeline por Etapa</h3></div><div class="card-body" id="pipelineChart"></div></div>
      <div class="card"><div class="card-header"><h3>Agenda de Hoje</h3><button class="btn-primary btn-sm" onclick="navigateTo('calendar')">Ver tudo</button></div><div class="card-body" id="todayEvents" style="padding:12px"></div></div>
    </div>`;

    try {
        const stats = await DB.getStats();
        const todayEvs = await DB.getTodayEvents();
        renderStats(stats);
        renderPipeline(stats);
        renderTodayEvents(todayEvs);
        updateBadges(stats, todayEvs);
    } catch (e) {
        showToast('Erro ao carregar dashboard: ' + e.message, 'error');
    }
}

function renderStats(s) {
    document.getElementById('statsGrid').innerHTML = `
    <div class="stat-card blue">
      <div class="stat-icon blue"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
      <div class="stat-value">${s.totalContacts}</div>
      <div class="stat-label">Total de Contatos</div>
      <span class="stat-change up">↑ ${s.clientes} clientes</span>
    </div>
    <div class="stat-card green">
      <div class="stat-icon green"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
      <div class="stat-value">${fmtCurrency(s.ganhos)}</div>
      <div class="stat-label">Receita Fechada</div>
      <span class="stat-change up">✓ Ganhos</span>
    </div>
    <div class="stat-card yellow">
      <div class="stat-icon yellow"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="5" height="15" rx="1"/></svg></div>
      <div class="stat-value">${fmtCurrency(s.pipeline)}</div>
      <div class="stat-label">Pipeline Ativo</div>
      <span class="stat-change up">Em negociação</span>
    </div>
    <div class="stat-card purple">
      <div class="stat-icon purple"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
      <div class="stat-value">${s.pendingEvents}</div>
      <div class="stat-label">Agendamentos Pendentes</div>
      <span class="stat-change ${s.todayEvents > 0 ? 'up' : ''}">${s.todayEvents} hoje</span>
    </div>`;
}

function renderPipeline(s) {
    const stages = [
        { key: 'contato', label: 'Contato', color: '#6366f1' },
        { key: 'qualificacao', label: 'Qualificação', color: '#8b5cf6' },
        { key: 'proposta', label: 'Proposta', color: '#06b6d4' },
        { key: 'negociacao', label: 'Negociação', color: '#f59e0b' },
    ];
    const max = Math.max(...stages.map(st => s.byStage[st.key] || 0), 1);
    document.getElementById('pipelineChart').innerHTML = `<div class="pipeline-stages">` +
        stages.map(st => {
            const count = s.byStage[st.key] || 0;
            const pct = Math.round((count / max) * 100);
            return `<div class="pipeline-stage">
        <span class="stage-label">${st.label}</span>
        <div class="stage-bar-wrap"><div class="stage-bar" style="width:${pct}%;background:${st.color}"></div></div>
        <span class="stage-count">${count}</span>
      </div>`;
        }).join('') + `</div>`;
}

function renderTodayEvents(events) {
    const el = document.getElementById('todayEvents');
    if (!events.length) {
        el.innerHTML = `<div class="empty-state" style="padding:30px 0"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><p>Nenhum agendamento hoje</p></div>`;
        return;
    }
    const typeColors = { consulta: '#6366f1', reuniao: '#06b6d4', ligacao: '#10b981', followup: '#f59e0b', outro: '#6b7280' };
    el.innerHTML = `<div class="event-list">` +
        events.slice(0, 6).map(ev => `
      <div class="event-item" onclick="openEventModal(${JSON.stringify(ev).replace(/"/g, '&quot;')})">
        <div class="event-dot" style="background:${typeColors[ev.event_type] || '#6366f1'}"></div>
        <div class="event-info">
          <div class="event-name">${ev.title}</div>
          <div class="event-meta">${ev.crm_contacts?.name || 'Sem contato'} · ${eventTypeLabel(ev.event_type)}</div>
        </div>
        ${ev.start_time ? `<div class="event-time">${fmtTime(ev.start_time)}</div>` : ''}
      </div>`).join('') + `</div>`;
}

function updateBadges(stats, todayEvs) {
    const bc = document.getElementById('badge-contacts');
    const bev = document.getElementById('badge-calendar');
    if (bc) { bc.textContent = stats.totalContacts; }
    if (bev) { bev.textContent = todayEvs.length || ''; }
}
