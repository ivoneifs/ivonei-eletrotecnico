// ================================================
// contacts.js — Contacts Page
// ================================================

let contactsFilter = 'todos';
let contactsSearch = '';
let allContacts = [];

async function renderContacts() {
    const page = document.getElementById('page-contacts');
    page.innerHTML = `
    <div class="page-header">
      <div><h1>Contatos</h1><p>Gerencie seus clientes e leads</p></div>
      <button class="btn-primary" onclick="openContactModal()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Novo Contato
      </button>
    </div>
    <div class="contacts-toolbar">
      <div class="filter-tabs" id="contactFilterTabs">
        ${['todos', 'lead', 'prospect', 'cliente', 'inativo'].map(f =>
        `<button class="filter-tab ${f === contactsFilter ? 'active' : ''}" data-filter="${f}" onclick="setContactFilter('${f}')">${f.charAt(0).toUpperCase() + f.slice(1)}</button>`
    ).join('')}
      </div>
      <div class="contacts-actions">
        <div class="search-box" style="display:flex">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Buscar contato..." id="contactSearch" oninput="searchContacts(this.value)" style="width:200px" />
        </div>
      </div>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Contato</th><th>WhatsApp</th><th>Empresa</th>
            <th>Status</th><th>Tags</th><th>Criado em</th><th></th>
          </tr></thead>
          <tbody id="contactsTableBody"><tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted)">Carregando...</td></tr></tbody>
        </table>
      </div>
    </div>`;
    await loadContacts();
}

async function loadContacts() {
    try {
        allContacts = await DB.getContacts(contactsFilter === 'todos' ? null : contactsFilter);
        renderContactsTable(allContacts);
        const bc = document.getElementById('badge-contacts');
        if (bc) bc.textContent = allContacts.length;
    } catch (e) {
        showToast('Erro ao carregar contatos', 'error');
    }
}

function renderContactsTable(contacts) {
    const tbody = document.getElementById('contactsTableBody');
    if (!tbody) return;
    if (!contacts.length) {
        tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
      <p>Nenhum contato encontrado</p>
      <button class="btn-primary" onclick="openContactModal()">Adicionar contato</button>
    </div></td></tr>`;
        return;
    }

    tbody.innerHTML = contacts.map(c => `
    <tr onclick="showContactDetail('${c.id}')">
      <td>
        <div class="contact-cell">
          <div class="contact-avatar" style="background:${c.avatar_color || '#6366f1'}">${initials(c.name)}</div>
          <div>
            <div class="contact-name">${c.name}</div>
            <div class="contact-email">${c.email || '—'}</div>
          </div>
        </div>
      </td>
      <td>${c.phone || '—'}</td>
      <td>${c.company || '—'}</td>
      <td><span class="badge badge-${c.status}">${c.status}</span></td>
      <td>${(c.tags || []).slice(0, 2).map(t => `<span class="tag-chip">${t}</span>`).join(' ')}</td>
      <td>${fmtDate(c.created_at?.split('T')[0])}</td>
      <td onclick="event.stopPropagation()">
        <div class="action-btns">
          <button class="action-btn" onclick="editContact('${c.id}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Editar
          </button>
          <button class="action-btn danger" onclick="deleteContact('${c.id}','${c.name.replace(/'/g, "\\'")}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
            Excluir
          </button>
        </div>
      </td>
    </tr>`).join('');
}

function setContactFilter(f) {
    contactsFilter = f;
    document.querySelectorAll('#contactFilterTabs .filter-tab').forEach(btn =>
        btn.classList.toggle('active', btn.dataset.filter === f));
    loadContacts();
}

async function searchContacts(term) {
    contactsSearch = term.trim();
    if (!contactsSearch) { renderContactsTable(allContacts); return; }
    try {
        const results = await DB.searchContacts(contactsSearch);
        renderContactsTable(results);
    } catch (e) { }
}

async function editContact(id) {
    try {
        const contact = await DB.getContact(id);
        openContactModal(contact);
    } catch (e) { showToast('Erro ao carregar contato', 'error'); }
}

async function deleteContact(id, name) {
    if (!confirm(`Excluir o contato "${name}"? Esta ação não pode ser desfeita.`)) return;
    try {
        await DB.deleteContact(id);
        showToast('Contato excluído', 'success');
        loadContacts();
    } catch (e) { showToast('Erro ao excluir: ' + e.message, 'error'); }
}

async function showContactDetail(id) {
    try {
        const c = await DB.getContact(id);
        const [deals, events] = await Promise.all([
            supabase.from('crm_deals').select('*').eq('contact_id', id).order('created_at', { ascending: false }),
            supabase.from('crm_events').select('*').eq('contact_id', id).order('event_date', { ascending: false }).limit(5)
        ]);
        const ds = deals.data || [];
        const ev = events.data || [];

        document.getElementById('contactDetailName').textContent = c.name;
        document.getElementById('contactDetailBody').innerHTML = `
      <div class="contact-detail-header">
        <div class="contact-detail-avatar" style="background:${c.avatar_color || '#6366f1'}">${initials(c.name)}</div>
        <div class="contact-detail-info">
          <h2>${c.name}</h2>
          <p>${c.company || ''} ${c.company && c.status ? '·' : ''} <span class="badge badge-${c.status}">${c.status}</span></p>
        </div>
        <button class="btn-primary btn-sm" onclick="editContact('${c.id}');closeModal('contactDetailModal')">Editar</button>
      </div>
      <div class="detail-grid" style="margin-bottom:20px">
        <div class="detail-field"><label>WhatsApp</label><p>${c.phone || '—'}</p></div>
        <div class="detail-field"><label>Email</label><p>${c.email || '—'}</p></div>
        <div class="detail-field"><label>Empresa</label><p>${c.company || '—'}</p></div>
        <div class="detail-field"><label>Responsável</label><p>${c.owner || '—'}</p></div>
        ${c.notes ? `<div class="detail-field" style="grid-column:1/-1"><label>Observações</label><p>${c.notes}</p></div>` : ''}
        ${(c.tags || []).length ? `<div class="detail-field" style="grid-column:1/-1"><label>Tags</label><div class="detail-tags">${c.tags.map(t => `<span class="tag-chip">${t}</span>`).join('')}</div></div>` : ''}
      </div>
      ${ds.length ? `
      <h4 style="font-size:13px;font-weight:600;margin-bottom:10px">Oportunidades (${ds.length})</h4>
      <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px">
        ${ds.map(d => `<div style="background:var(--bg-elevated);padding:10px 14px;border-radius:8px;display:flex;align-items:center;justify-content:space-between">
          <span style="font-size:13px;font-weight:500">${d.title}</span>
          <div style="display:flex;gap:10px;align-items:center">
            <span class="badge badge-${d.stage.replace('-ganho', '').replace('-perdido', '')}" style="font-size:10px">${d.stage}</span>
            ${d.value ? `<span style="font-size:12px;font-weight:700;color:var(--success)">${fmtCurrency(d.value)}</span>` : ''}
          </div>
        </div>`).join('')}
      </div>` : ''}
      ${ev.length ? `
      <h4 style="font-size:13px;font-weight:600;margin-bottom:10px">Histórico de Agendamentos</h4>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${ev.map(e => `<div style="background:var(--bg-elevated);padding:10px 14px;border-radius:8px;display:flex;align-items:center;gap:12px">
          <span class="badge badge-${e.event_type}">${eventTypeLabel(e.event_type)}</span>
          <span style="flex:1;font-size:13px">${e.title}</span>
          <span style="font-size:11px;color:var(--text-secondary)">${fmtDate(e.event_date)}</span>
        </div>`).join('')}
      </div>` : ''}`;
        openModal('contactDetailModal');
    } catch (e) { showToast('Erro ao carregar detalhes', 'error'); }
}

// Save contact
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('saveContactBtn').addEventListener('click', async () => {
        const id = document.getElementById('contact-id').value;
        const name = document.getElementById('contact-name').value.trim();
        if (!name) { showToast('Nome é obrigatório', 'error'); return; }

        const payload = {
            name,
            company: document.getElementById('contact-company').value.trim() || null,
            phone: document.getElementById('contact-phone').value.trim() || null,
            email: document.getElementById('contact-email').value.trim() || null,
            status: document.getElementById('contact-status').value,
            owner: document.getElementById('contact-owner').value.trim() || null,
            tags: document.getElementById('contact-tags').value.split(',').map(t => t.trim()).filter(Boolean),
            notes: document.getElementById('contact-notes').value.trim() || null,
            avatar_color: randomColor(),
        };

        try {
            if (id) { await DB.updateContact(id, payload); showToast('Contato atualizado!', 'success'); }
            else { await DB.createContact(payload); showToast('Contato criado!', 'success'); }
            closeModal('contactModal');
            if (document.getElementById('page-contacts').classList.contains('active')) loadContacts();
        } catch (e) { showToast('Erro: ' + e.message, 'error'); }
    });
});
