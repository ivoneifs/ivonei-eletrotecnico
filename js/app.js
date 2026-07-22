// ================================================
// app.js — Main Application Controller
// ================================================

// ---- Navigation ----
const PAGES = ['dashboard', 'contacts', 'kanban', 'calendar'];
let currentPage = 'dashboard';

function navigateTo(page) {
    if (!PAGES.includes(page)) return;
    currentPage = page;

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    document.getElementById('page-' + page).classList.add('active');
    const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (navItem) navItem.classList.add('active');

    // Render the page
    switch (page) {
        case 'dashboard': renderDashboard(); break;
        case 'contacts': renderContacts(); break;
        case 'kanban': renderKanban(); break;
        case 'calendar': renderCalendar(); break;
    }

    // Close sidebar on mobile
    if (window.innerWidth < 768) closeSidebar();
}

// ---- Sidebar Mobile ----
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('show');
}
function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('show');
}

// ---- Modal Keyboard ----
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        ['contactModal', 'dealModal', 'eventModal', 'contactDetailModal'].forEach(id => closeModal(id));
    }
});

// ---- Overlay click closes modals ----
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', function (e) {
        if (e.target === this) closeModal(this.id);
    });
});

// ---- Toast container ----
function ensureToastContainer() {
    if (!document.getElementById('toastContainer')) {
        const tc = document.createElement('div');
        tc.id = 'toastContainer';
        tc.className = 'toast-container';
        document.body.appendChild(tc);
    }
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', async () => {
    ensureToastContainer();

    // Nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => navigateTo(item.dataset.page));
    });

    // Hamburger
    const hamburger = document.getElementById('hamburger');
    if (hamburger) hamburger.addEventListener('click', toggleSidebar);

    // Sidebar overlay
    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) overlay.addEventListener('click', closeSidebar);

    // Start on dashboard
    navigateTo('dashboard');

    // Announce loaded
    console.log('%c✓ CRM Secretária carregado!', 'color:#10b981;font-weight:bold;font-size:14px');
});
