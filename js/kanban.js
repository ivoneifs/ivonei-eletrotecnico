// ================================================
// kanban.js — Kanban Board Page
// ================================================

const STAGES = [
    { key: 'contato', label: 'Contato', color: '#6366f1', icon: '📞' },
    { key: 'qualificacao', label: 'Qualificação', color: '#8b5cf6', icon: '🔍' },
    { key: 'proposta', label: 'Proposta', color: '#06b6d4', icon: '📄' },
    { key: 'negociacao', label: 'Negociação', color: '#f59e0b', icon: '🤝' },
    { key: 'fechado-ganho', label: 'Fechado ✓', color: '#10b981', icon: '🏆' },
    { key: 'fechado-perdido', label: 'Perdido', color: '#ef4444', icon: '✗' },
];

let allDeals = [];
let draggedItem = null;

async function renderKanban() {
    const page = document.getElementById('page-kanban');
    page.innerHTML = `
    <div class="page-header">
      <div><h1>Pipeline</h1><p>Gerencie suas oportunidades</p></div>
      <button class="btn-primary" onclick="openDealModal()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Nova Oportunidade
      </button>
    </div>
    <div id="kanbanBoard" class="kanban-board" style="overflow-x:auto;padding-bottom:16px">
      <div style="text-align:center;padding:60px;color:var(--text-muted)">Carregando pipeline...</div>
    </div>`;
    await loadKanban();
}

async function loadKanban() {
    try {
        allDeals = await DB.getDeals();
        renderKanbanBoard();
    } catch (e) {
        showToast('Erro ao carregar pipeline', 'error');
    }
}

function renderKanbanBoard() {
    const board = document.getElementById('kanbanBoard');
    if (!board) return;

    const totalPipeline = allDeals
        .filter(d => !['fechado-ganho', 'fechado-perdido'].includes(d.stage))
        .reduce((s, d) => s + (Number(d.value) || 0), 0);

    board.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;padding:0 0 16px 0;color:var(--text-secondary);font-size:13px">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
      Pipeline total: <strong style="color:var(--success)">${fmtCurrency(totalPipeline)}</strong>
    </div>
    <div class="kanban-columns">
      ${STAGES.map(s => buildColumn(s)).join('')}
    </div>`;

    setupDragAndDrop();
}

function buildColumn(stage) {
    const deals = allDeals.filter(d => d.stage === stage.key);
    const total = deals.reduce((s, d) => s + (Number(d.value) || 0), 0);

    return `
    <div class="kanban-column" data-stage="${stage.key}">
      <div class="kanban-column-header" style="border-top:3px solid ${stage.color}">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:14px">${stage.icon}</span>
          <span class="kanban-column-title">${stage.label}</span>
          <span class="kanban-count" style="background:${stage.color}22;color:${stage.color}">${deals.length}</span>
        </div>
        ${total ? `<span style="font-size:11px;color:${stage.color};font-weight:600">${fmtCurrency(total)}</span>` : ''}
      </div>
      <div class="kanban-cards" id="col-${stage.key}" data-stage="${stage.key}">
        ${deals.length ? deals.map(d => buildDealCard(d, stage)).join('') :
            `<div class="kanban-empty">Arraste oportunidades<br>para cá</div>`}
        <button class="kanban-add-btn" onclick="openDealModal({stage:'${stage.key}'})">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Adicionar
        </button>
      </div>
    </div>`;
}

function buildDealCard(deal, stage) {
    const prio = { baixa: '🟢', normal: '🟡', alta: '🔴', urgente: '🚨' };
    const contact = deal.crm_contacts;

    return `
    <div class="kanban-card" draggable="true" data-deal-id="${deal.id}" data-stage="${stage.key}">
      <div class="kanban-card-header">
        <div class="deal-title" onclick="openDealModal(${JSON.stringify(deal).replace(/"/g, '&quot;')})">${deal.title}</div>
        <div style="display:flex;gap:6px;align-items:center">
          ${prio[deal.priority] || ''}
          <button class="action-btn danger icon-only" onclick="deleteDeal('${deal.id}')">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          </button>
        </div>
      </div>
      ${contact ? `
        <div class="deal-contact">
          <div class="contact-avatar sm" style="background:${deal.avatar_color || '#6366f1'}">${initials(contact.name)}</div>
          <span>${contact.name}</span>
        </div>` : ''}
      ${deal.description ? `<p class="deal-desc">${deal.description}</p>` : ''}
      <div class="deal-footer">
        ${deal.value ? `<span class="deal-value">${fmtCurrency(deal.value)}</span>` : '<span></span>'}
        <span class="deal-date">${fmtDate(deal.created_at?.split('T')[0])}</span>
      </div>
    </div>`;
}

function setupDragAndDrop() {
    const cards = document.querySelectorAll('.kanban-card');
    const cols = document.querySelectorAll('.kanban-cards');

    cards.forEach(card => {
        card.addEventListener('dragstart', e => {
            draggedItem = card;
            card.style.opacity = '0.4';
            e.dataTransfer.effectAllowed = 'move';
        });
        card.addEventListener('dragend', () => {
            if (draggedItem) draggedItem.style.opacity = '';
            document.querySelectorAll('.kanban-cards').forEach(c => c.classList.remove('drag-over'));
            draggedItem = null;
        });
    });

    cols.forEach(col => {
        col.addEventListener('dragover', e => {
            e.preventDefault();
            col.classList.add('drag-over');
        });
        col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
        col.addEventListener('drop', async e => {
            e.preventDefault();
            col.classList.remove('drag-over');
            if (!draggedItem) return;

            const dealId = draggedItem.dataset.dealId;
            const newStage = col.dataset.stage;
            const oldStage = draggedItem.dataset.stage;
            if (newStage === oldStage) return;

            // Optimistic UI: update local data
            const deal = allDeals.find(d => String(d.id) === String(dealId));
            if (deal) deal.stage = newStage;

            try {
                await DB.updateDeal(dealId, { stage: newStage });
                showToast(`Movido para "${STAGES.find(s => s.key === newStage)?.label}"`, 'success');
                await loadKanban();
            } catch (err) {
                showToast('Erro ao mover card: ' + err.message, 'error');
                if (deal) deal.stage = oldStage;
                renderKanbanBoard();
            }
        });
    });
}

async function deleteDeal(id) {
    if (!confirm('Excluir esta oportunidade?')) return;
    try {
        await DB.deleteDeal(id);
        showToast('Oportunidade removida', 'success');
        loadKanban();
    } catch (e) { showToast('Erro ao excluir', 'error'); }
}

// Save deal
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('saveDealBtn').addEventListener('click', async () => {
        const id = document.getElementById('deal-id').value;
        const title = document.getElementById('deal-title').value.trim();
        if (!title) { showToast('Título é obrigatório', 'error'); return; }

        const payload = {
            title,
            contact_id: document.getElementById('deal-contact').value || null,
            value: parseFloat(document.getElementById('deal-value').value) || null,
            stage: document.getElementById('deal-stage').value,
            priority: document.getElementById('deal-priority').value,
            description: document.getElementById('deal-desc').value.trim() || null,
        };

        try {
            if (id) { await DB.updateDeal(id, payload); showToast('Oportunidade atualizada!', 'success'); }
            else { await DB.createDeal(payload); showToast('Oportunidade criada!', 'success'); }
            closeModal('dealModal');
            if (document.getElementById('page-kanban').classList.contains('active')) loadKanban();
        } catch (e) { showToast('Erro: ' + e.message, 'error'); }
    });
});
