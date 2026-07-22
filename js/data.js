// ================================================
// data.js — Supabase Client + Data Layer
// ================================================

const SUPABASE_URL = 'https://gzrmhqueubxpqvlmfxxb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6cm1ocXVldWJ4cHF2bG1meHhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2OTM3ODIsImV4cCI6MjEwMDI2OTc4Mn0.xNIzO39i5UHTYyqdSJh5vmOG2gz1mZL0C9UoF7j2yRA';

// Load Supabase from CDN (included in index.html via script tag)
const { createClient } = window.supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ==================== CONTACTS ====================

const DB = {
    // --- Contacts ---
    async getContacts(filter = null) {
        let query = supabase.from('crm_contacts').select('*').order('created_at', { ascending: false });
        if (filter && filter !== 'todos') query = query.eq('status', filter);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    async createContact(contact) {
        const { data, error } = await supabase.from('crm_contacts').insert([contact]).select().single();
        if (error) throw error;
        return data;
    },

    async updateContact(id, updates) {
        const { data, error } = await supabase.from('crm_contacts').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    },

    async deleteContact(id) {
        const { error } = await supabase.from('crm_contacts').delete().eq('id', id);
        if (error) throw error;
    },

    async getContact(id) {
        const { data, error } = await supabase.from('crm_contacts').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    },

    async searchContacts(term) {
        const { data, error } = await supabase
            .from('crm_contacts').select('*')
            .or(`name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%,company.ilike.%${term}%`)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    // --- Deals ---
    async getDeals() {
        const { data, error } = await supabase
            .from('crm_deals')
            .select('*, crm_contacts(name, phone)')
            .order('position').order('created_at');
        if (error) throw error;
        return data || [];
    },

    async createDeal(deal) {
        const { data, error } = await supabase.from('crm_deals').insert([deal]).select('*, crm_contacts(name, phone)').single();
        if (error) throw error;
        return data;
    },

    async updateDeal(id, updates) {
        const { data, error } = await supabase.from('crm_deals').update(updates).eq('id', id).select('*, crm_contacts(name, phone)').single();
        if (error) throw error;
        return data;
    },

    async deleteDeal(id) {
        const { error } = await supabase.from('crm_deals').delete().eq('id', id);
        if (error) throw error;
    },

    // --- Events ---
    async getEvents(dateFrom = null, dateTo = null) {
        let query = supabase.from('crm_events').select('*, crm_contacts(name, phone)').order('event_date').order('start_time');
        if (dateFrom) query = query.gte('event_date', dateFrom);
        if (dateTo) query = query.lte('event_date', dateTo);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    async getEventsForMonth(year, month) {
        const from = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const to = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
        return this.getEvents(from, to);
    },

    async getTodayEvents() {
        const today = new Date().toISOString().split('T')[0];
        return this.getEvents(today, today);
    },

    async createEvent(event) {
        const { data, error } = await supabase.from('crm_events').insert([event]).select('*, crm_contacts(name, phone)').single();
        if (error) throw error;
        return data;
    },

    async updateEvent(id, updates) {
        const { data, error } = await supabase.from('crm_events').update(updates).eq('id', id).select('*, crm_contacts(name, phone)').single();
        if (error) throw error;
        return data;
    },

    async deleteEvent(id) {
        const { error } = await supabase.from('crm_events').delete().eq('id', id);
        if (error) throw error;
    },

    // --- Stats ---
    async getStats() {
        const [contacts, deals, events] = await Promise.all([
            supabase.from('crm_contacts').select('status', { count: 'exact' }),
            supabase.from('crm_deals').select('stage, value'),
            supabase.from('crm_events').select('event_date, completed')
        ]);

        const today = new Date().toISOString().split('T')[0];
        const cs = contacts.data || [];
        const ds = deals.data || [];
        const ev = events.data || [];

        const totalContacts = cs.length;
        const clientes = cs.filter(c => c.status === 'cliente').length;
        const leads = cs.filter(c => c.status === 'lead').length;

        const ganhos = ds.filter(d => d.stage === 'fechado-ganho').reduce((s, d) => s + (Number(d.value) || 0), 0);
        const pipeline = ds.filter(d => !['fechado-ganho', 'fechado-perdido'].includes(d.stage)).reduce((s, d) => s + (Number(d.value) || 0), 0);

        const todayEvents = ev.filter(e => e.event_date === today).length;
        const pendingEvents = ev.filter(e => !e.completed && e.event_date >= today).length;

        const byStage = {
            contato: ds.filter(d => d.stage === 'contato').length,
            qualificacao: ds.filter(d => d.stage === 'qualificacao').length,
            proposta: ds.filter(d => d.stage === 'proposta').length,
            negociacao: ds.filter(d => d.stage === 'negociacao').length,
        };

        return { totalContacts, clientes, leads, ganhos, pipeline, todayEvents, pendingEvents, byStage, deals: ds };
    }
};

// ==================== Helpers ====================

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#3b82f6'];
function randomColor() { return COLORS[Math.floor(Math.random() * COLORS.length)]; }

function fmtCurrency(v) {
    return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDate(d) {
    if (!d) return '—';
    const [y, m, day] = String(d).split('-');
    return `${day}/${m}/${y}`;
}

function fmtTime(t) {
    if (!t) return '';
    return t.slice(0, 5);
}

function initials(name) {
    if (!name) return '?';
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function eventTypeLabel(type) {
    const map = { consulta: '🏥 Consulta', reuniao: '📋 Reunião', ligacao: '📞 Ligação', followup: '🔔 Follow-up', outro: '📅 Outro' };
    return map[type] || type;
}

function showToast(msg, type = 'info') {
    const icons = {
        success: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`,
        error: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
        info: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `${icons[type] || icons.info}<span class="toast-msg">${msg}</span><button class="toast-close" onclick="this.parentElement.remove()">✕</button>`;
    document.getElementById('toastContainer').appendChild(t);
    setTimeout(() => t.remove(), 4000);
}

// Contact select helper
async function populateContactSelect(selectId) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    try {
        const contacts = await DB.getContacts();
        sel.innerHTML = '<option value="">— Nenhum —</option>' +
            contacts.map(c => `<option value="${c.id}">${c.name}${c.company ? ` (${c.company})` : ''}</option>`).join('');
    } catch (e) { console.error(e); }
}

// Open modals
function openContactModal(contact = null) {
    document.getElementById('contactForm').reset();
    document.getElementById('contact-id').value = contact?.id || '';
    document.getElementById('contactModalTitle').textContent = contact ? 'Editar Contato' : 'Novo Contato';
    if (contact) {
        document.getElementById('contact-name').value = contact.name || '';
        document.getElementById('contact-company').value = contact.company || '';
        document.getElementById('contact-phone').value = contact.phone || '';
        document.getElementById('contact-email').value = contact.email || '';
        document.getElementById('contact-status').value = contact.status || 'lead';
        document.getElementById('contact-owner').value = contact.owner || '';
        document.getElementById('contact-tags').value = (contact.tags || []).join(', ');
        document.getElementById('contact-notes').value = contact.notes || '';
    }
    openModal('contactModal');
}

async function openDealModal(deal = null) {
    document.getElementById('dealForm').reset();
    document.getElementById('deal-id').value = deal?.id || '';
    document.getElementById('dealModalTitle').textContent = deal ? 'Editar Oportunidade' : 'Nova Oportunidade';
    await populateContactSelect('deal-contact');
    if (deal) {
        document.getElementById('deal-title').value = deal.title || '';
        document.getElementById('deal-contact').value = deal.contact_id || '';
        document.getElementById('deal-value').value = deal.value || '';
        document.getElementById('deal-stage').value = deal.stage || 'contato';
        document.getElementById('deal-priority').value = deal.priority || 'normal';
        document.getElementById('deal-desc').value = deal.description || '';
    }
    openModal('dealModal');
}

async function openEventModal(event = null, defaultDate = null) {
    document.getElementById('eventForm').reset();
    document.getElementById('event-id').value = event?.id || '';
    document.getElementById('eventModalTitle').textContent = event ? 'Editar Agendamento' : 'Novo Agendamento';
    await populateContactSelect('event-contact');
    const today = defaultDate || new Date().toISOString().split('T')[0];
    document.getElementById('event-date').value = event?.event_date || today;
    if (event) {
        document.getElementById('event-title').value = event.title || '';
        document.getElementById('event-type').value = event.event_type || 'consulta';
        document.getElementById('event-start').value = event.start_time?.slice(0, 5) || '09:00';
        document.getElementById('event-end').value = event.end_time?.slice(0, 5) || '09:30';
        document.getElementById('event-contact').value = event.contact_id || '';
        document.getElementById('event-notes').value = event.notes || '';
    }
    openModal('eventModal');
}

function openModal(id) {
    document.getElementById(id).classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    document.getElementById(id).classList.remove('open');
    document.body.style.overflow = '';
}
