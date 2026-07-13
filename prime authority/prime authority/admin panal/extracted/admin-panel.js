// ═════════════════════════════════════════════════════════════════════════
// ADMIN PANEL JAVASCRIPT
// ═════════════════════════════════════════════════════════════════════════

const ADMIN_EMAIL = "admin@primeauthority.com";

let currentTab = "dashboard";
let currentUser = null;
let allData = {
    joins: [],
    tournaments: [],
    scrims: [],
    contacts: [],
    lineup: [],
    allUsers: [],
    tournamentOn: false,
    scrimOn: false,
    joinOn: false,
    tournamentBannerEnabled: false,
    scrimBannerEnabled: false,
    joinBannerEnabled: false,
    tournamentBannerImage: '',
    scrimBannerImage: '',
    joinBannerImage: '',
    upcomingTournamentBannerImage: '',
    hero: {
        title: "PRIME AUTHORITY",
        subtitle: "Where Champions Are Made.",
        description: "India's Professional Free Fire Esports Organization",
        buttonText: "Join Organization",
        buttonLink: "join.html"
    }
};

let heroDraft = { ...allData.hero };
let lineupDraft = {
    teamName: "",
    serialNumber: "",
    playerIgn: "",
    playerUid: "",
    role: "",
    joiningDate: "",
    logo: ""
};
let rosterDraft = {
    teamName: "",
    logo: "",
    players: [] // { id?, serialNumber, playerIgn, playerUid, role, joiningDate, status, profile }
};
let teamFormVisible = false;
let editingLineupId = null;

let searchQuery = "";
let filterStatus = "All";
let currentViewEntry = null;

// ═════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═════════════════════════════════════════════════════════════════════════

window.addEventListener('DOMContentLoaded', async () => {
    try {
        await ensureFirebaseReady();
    } catch (err) {
        console.error('Firebase did not initialize:', err);
    }

    // Check if on login page or dashboard
    if (window.location.pathname.includes('admin-login')) {
        initializeLoginPage();
    } else if (window.location.pathname.includes('admin-dashboard') || window.location.href.endsWith('/extracted/')) {
        initializeDashboard();
    } else {
        // Try to determine which page we're on
        if (document.getElementById('loginForm')) {
            initializeLoginPage();
        } else if (document.getElementById('contentArea')) {
            initializeDashboard();
        }
    }
});

// ═════════════════════════════════════════════════════════════════════════
// LOGIN PAGE
// ═════════════════════════════════════════════════════════════════════════

async function initializeLoginPage() {
    try {
        await ensureFirebaseReady();
        await checkAuthAndRedirect();
    } catch (err) {
        console.error('Login page initialization error:', err);
    }

    const form = document.getElementById('loginForm');
    if (form) {
        form.addEventListener('submit', handleLogin);
    }

    const togglePasswordBtn = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            togglePasswordBtn.textContent = isPassword ? '🙈' : '👁️';
            togglePasswordBtn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
        });
    }
}

async function checkAuthAndRedirect() {
    try {
        const user = await getCurrentUser();
        if (user && user.email === ADMIN_EMAIL) {
            window.location.href = 'admin-dashboard.html';
        }
    } catch (err) {
        console.log('User not logged in');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    await ensureFirebaseReady();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('errorDiv');
    const errorMsg = document.getElementById('errorMsg');
    const loginBtn = document.getElementById('loginBtn');
    
    errorDiv.classList.remove('show');
    
    if (email !== ADMIN_EMAIL) {
        showError('Access denied. Admin credentials required.');
        return;
    }
    
    loginBtn.disabled = true;
    loginBtn.textContent = 'LOGGING IN...';
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = 'admin-dashboard.html';
    } catch (err) {
        showError('Invalid credentials. ' + (err.message || ''));
        loginBtn.disabled = false;
        loginBtn.textContent = 'LOGIN';
    }
}

function showError(message) {
    const errorDiv = document.getElementById('errorDiv');
    const errorMsg = document.getElementById('errorMsg');
    errorMsg.textContent = message;
    errorDiv.classList.add('show');
}

// ═════════════════════════════════════════════════════════════════════════
// DASHBOARD INITIALIZATION
// ═════════════════════════════════════════════════════════════════════════

async function initializeDashboard() {
    try {
        await ensureFirebaseReady();

        // Check auth first
        const user = await getCurrentUser();
        if (!user || user.email !== ADMIN_EMAIL) {
            window.location.href = 'admin-login.html';
            return;
        }
        
        currentUser = user;
        
        // Setup navigation
        setupNavigation();
        
        // Setup date display
        displayDate();
        
        // Setup event listeners
        document.getElementById('searchInput').addEventListener('input', (e) => {
            searchQuery = e.target.value;
            renderCurrentTab();
        });
        
        // Load Firebase data
        await loadFirebaseData();
        
        // Initial render
        switchTab('dashboard');
        
    } catch (err) {
        console.error('Error initializing dashboard:', err);
        window.location.href = 'admin-login.html';
    }
}

function setupNavigation() {
    const navItems = [
        { key: "dashboard", label: "Dashboard", icon: "📊" },
        { key: "hero", label: "Hero Section", icon: "🖥️" },
        { key: "tournament", label: "Tournament Registration", icon: "🏆" },
        { key: "scrims", label: "Scrims Registration", icon: "⚔️" },
        { key: "benefits", label: "Join Applications", icon: "📋" },
        { key: "team", label: "Our Lineup", icon: "👥" },
        { key: "contact", label: "Contact Requests", icon: "📧" },
        { key: "journey", label: "Journey", icon: "🚩" },
        { key: "upcoming", label: "Upcoming Tournament", icon: "🎯" },
        { key: "total-users", label: "Total Users", icon: "👥" },
        { key: "analyse", label: "Analytics", icon: "📈" },
        { key: "notifications", label: "Notifications", icon: "🔔" },
        { key: "settings", label: "Website Settings", icon: "⚙️" },
        { key: "profile", label: "Admin Profile", icon: "👤" }
    ];
    
    const navContainer = document.getElementById('navItems');
    navContainer.innerHTML = navItems.map(item => `
        <button class="nav-item" onclick="switchTab('${item.key}')" title="${item.label}">
            <span style="font-size: 18px;">${item.icon}</span>
            <span>${item.label}</span>
        </button>
    `).join('');
}

function displayDate() {
    const d = new Date();
    const date = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const day = d.toLocaleDateString('en-IN', { weekday: 'long' });
    document.getElementById('dateDisplay').textContent = `📅 ${date} | ${day}`;
}

// ═════════════════════════════════════════════════════════════════════════
// FIREBASE DATA LOADING
// ═════════════════════════════════════════════════════════════════════════

async function loadFirebaseData() {
    try {
        // Get references
        const joinsRef = ref(database, 'applications');
        const tournamentsRef = ref(database, 'tournaments');
        const scrimsRef = ref(database, 'scrims');
        const contactsRef = ref(database, 'contacts');
        const heroRef = ref(database, 'hero');
        const lineupRef = ref(database, 'lineup');
        const tournamentFormRef = ref(database, 'settings/tournamentFormEnabled');
        const scrimFormRef = ref(database, 'settings/scrimFormEnabled');
        const joinFormRef = ref(database, 'settings/joinFormEnabled');
        const tournamentBannerEnabledRef = ref(database, 'settings/tournamentBannerEnabled');
        const scrimBannerEnabledRef = ref(database, 'settings/scrimBannerEnabled');
        const joinBannerEnabledRef = ref(database, 'settings/joinBannerEnabled');
        const tournamentBannerImageRef = ref(database, 'settings/tournamentBannerImage');
        const scrimBannerImageRef = ref(database, 'settings/scrimBannerImage');
        const joinBannerImageRef = ref(database, 'settings/joinBannerImage');
        const rosterSizeRef = ref(database, 'settings/rosterSize');
        
        // Setup listeners
        onValue(joinsRef, (snapshot) => {
            allData.joins = processSnapshot(snapshot);
            updateNotificationBadge();
            renderCurrentTab();
        });
        
        onValue(tournamentsRef, (snapshot) => {
            allData.tournaments = processSnapshot(snapshot);
            updateNotificationBadge();
            renderCurrentTab();
        });
        
        onValue(scrimsRef, (snapshot) => {
            allData.scrims = processSnapshot(snapshot);
            updateNotificationBadge();
            renderCurrentTab();
        });

        onValue(contactsRef, (snapshot) => {
            allData.contacts = processSnapshot(snapshot);
            renderCurrentTab();
        });
        
        onValue(heroRef, (snapshot) => {
            const data = snapshot.val() || {};
            allData.hero = {
                title: data.title || allData.hero.title,
                subtitle: data.subtitle || allData.hero.subtitle,
                description: data.description || allData.hero.description,
                buttonText: data.buttonText || allData.hero.buttonText,
                buttonLink: data.buttonLink || allData.hero.buttonLink
            };
            heroDraft = { ...allData.hero };
            renderCurrentTab();
        });
        
        onValue(lineupRef, (snapshot) => {
            allData.lineup = processSnapshot(snapshot)
                .sort((a, b) => Number(a.serialNumber || 0) - Number(b.serialNumber || 0));
            renderCurrentTab();
        });
        
        onValue(tournamentFormRef, (snapshot) => {
            allData.tournamentOn = snapshot.val() === true;
            renderCurrentTab();
        });
        
        onValue(scrimFormRef, (snapshot) => {
            allData.scrimOn = snapshot.val() === true;
            renderCurrentTab();
        });

        onValue(joinFormRef, (snapshot) => {
            allData.joinOn = snapshot.val() === true;
            renderCurrentTab();
        });

        onValue(tournamentBannerEnabledRef, (snapshot) => {
            allData.tournamentBannerEnabled = snapshot.val() === true;
            renderCurrentTab();
        });

        onValue(scrimBannerEnabledRef, (snapshot) => {
            allData.scrimBannerEnabled = snapshot.val() === true;
            renderCurrentTab();
        });

        onValue(joinBannerEnabledRef, (snapshot) => {
            allData.joinBannerEnabled = snapshot.val() === true;
            renderCurrentTab();
        });

        onValue(tournamentBannerImageRef, (snapshot) => {
            allData.tournamentBannerImage = snapshot.val() || '';
            renderCurrentTab();
        });

        onValue(scrimBannerImageRef, (snapshot) => {
            allData.scrimBannerImage = snapshot.val() || '';
            renderCurrentTab();
        });

        onValue(joinBannerImageRef, (snapshot) => {
            allData.joinBannerImage = snapshot.val() || '';
            renderCurrentTab();
        });

        onValue(rosterSizeRef, (snapshot) => {
            const v = snapshot.val();
            allData.rosterSize = Number(v) || 5;
            renderCurrentTab();
        });
        
        // Load users data from all applications, tournaments, and scrims
        const usersRef = ref(database, 'users');
        onValue(usersRef, (snapshot) => {
            if (snapshot.exists()) {
                allData.allUsers = Object.entries(snapshot.val() || {})
                    .map(([id, user]) => ({ uid: id, ...user }))
                    .reverse();
            } else {
                allData.allUsers = [];
            }
            renderCurrentTab();
        });

        // Load upcoming tournament banner image
        const upcomingBannerRef = ref(database, 'settings/upcomingTournamentBannerImage');
        onValue(upcomingBannerRef, (snapshot) => {
            allData.upcomingTournamentBannerImage = snapshot.val() || '';
            renderCurrentTab();
        });
        // Room settings and mapping
        const roomSettingsRef = ref(database, 'settings/roomSettings');
        const roomMappingRef = ref(database, 'settings/roomMapping');
        onValue(roomSettingsRef, (snapshot) => {
            allData.roomSettings = snapshot.val() || {};
            renderCurrentTab();
        });
        onValue(roomMappingRef, (snapshot) => {
            allData.roomMapping = snapshot.val() || {};
            renderCurrentTab();
        });
        
    } catch (err) {
        console.error('Error loading Firebase data:', err);
    }
}

function processSnapshot(snapshot) {
    if (!snapshot.exists()) return [];
    const data = snapshot.val();
    return Object.entries(data)
        .filter(([, v]) => v !== null && typeof v === 'object')
        .map(([id, v]) => ({ id, ...v }))
        .reverse();
}

function updateNotificationBadge() {
    const pending = [
        ...allData.joins,
        ...allData.tournaments,
        ...allData.scrims
    ].filter(e => !e.status || e.status === 'Pending').length;
    
    const badge = document.getElementById('notifBadge');
    if (pending > 0) {
        badge.style.display = 'flex';
        badge.textContent = pending > 9 ? '9+' : pending;
    } else {
        badge.style.display = 'none';
    }
}

// ═════════════════════════════════════════════════════════════════════════
// TAB SWITCHING
// ═════════════════════════════════════════════════════════════════════════

function switchTab(tabName) {
    currentTab = tabName;
    filterStatus = 'All';
    
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[onclick="switchTab('${tabName}')"]`).classList.add('active');
    
    renderCurrentTab();
}

function renderCurrentTab() {
    const contentArea = document.getElementById('contentArea');
    
    switch(currentTab) {
        case 'dashboard':
            contentArea.innerHTML = renderDashboard();
            break;
        case 'hero':
            contentArea.innerHTML = renderHeroTab();
            break;
        case 'tournament':
            contentArea.innerHTML = renderTournamentTab();
            break;
        case 'scrims':
            contentArea.innerHTML = renderScrrimsTab();
            break;
        case 'benefits':
            contentArea.innerHTML = renderJoinApplicationsTab();
            break;
        case 'team':
            contentArea.innerHTML = renderTeamTab();
            break;
        case 'contact':
            contentArea.innerHTML = renderContactTab();
            break;
        case 'upcoming':
            contentArea.innerHTML = renderUpcomingTournamentTab();
            break;
        case 'total-users':
            contentArea.innerHTML = renderTotalUsersTab();
            break;
        case 'analyse':
            contentArea.innerHTML = renderAnalyseTab();
            break;
        case 'notifications':
            contentArea.innerHTML = renderNotificationsTab();
            break;
        case 'settings':
            contentArea.innerHTML = renderSettingsTab();
            break;
        case 'profile':
            contentArea.innerHTML = renderProfileTab();
            break;
        default:
            contentArea.innerHTML = renderComingSoon(currentTab);
    }
    bindCurrentTabEvents();
}

// ═════════════════════════════════════════════════════════════════════════

function renderDashboard() {
    const pending = [...allData.joins, ...allData.tournaments, ...allData.scrims]
        .filter(e => !e.status || e.status === 'Pending').length;
    
    const stats = [
        { icon: '📋', label: 'Join Applications', val: allData.joins.length, color: '#3b82f6' },
        { icon: '🏆', label: 'Tournament Teams', val: allData.tournaments.length, color: '#8b5cf6' },
        { icon: '⚔️', label: 'Scrim Bookings', val: allData.scrims.length, color: '#f59e0b' },
        { icon: '📧', label: 'Contact Requests', val: allData.contacts.length, color: '#06b6d4' },
        { icon: '⏳', label: 'Pending Reviews', val: pending, color: '#ef4444' },
        { icon: '👥', label: 'Total Users', val: allData.allUsers.length, color: '#22c55e' }
    ];
    
    return `
        <div class="content-header">
            <h1>Welcome back, Admin 👋</h1>
            <p>Manage your website content and registrations.</p>
        </div>
        
        <div class="stats-grid">
            ${stats.map(s => `
                <div class="stat-card" style="border-color: ${s.color}22">
                    <div class="stat-icon" style="background: ${s.color}18">${s.icon}</div>
                    <div>
                        <div class="stat-value" style="color: ${s.color}">${s.val}</div>
                        <div class="stat-label">${s.label}</div>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div style="display: grid; grid-template-columns: 5fr 7fr; gap: 16px; margin-bottom: 16px;">
            <div class="card">
                <h3>Hero Section</h3>
                <div style="border-radius: 10px; overflow: hidden; background: linear-gradient(135deg,#1a0a0a,#0a0010); border: 1px solid #1e1e2e; padding: 28px 20px; text-align: center; margin-bottom: 14px;">
                    <div style="font-size: 28px; margin-bottom: 10px;">PA</div>
                    <h2 style="color: #dc2626; font-weight: 900; font-size: 18px; letter-spacing: 2px;">${allData.hero.title}</h2>
                    <p style="color: #888; font-size: 11px; margin-top: 4px;">${allData.hero.subtitle}</p>
                    <p style="color: #555; font-size: 10px; margin-top: 2px;">${allData.hero.description}</p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="btn" style="flex: 1; background: transparent; border: 1px solid #2a2a3a; color: #aaa;" onclick="window.open('/', '_blank')">👁️ Preview</button>
                    <button class="btn btn-primary" style="flex: 1;" onclick="switchTab('hero')">✏️ Edit Hero</button>
                </div>
            </div>
            
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                    <h3>Latest Join Organization Requests</h3>
                    <button style="background: none; border: none; color: #dc2626; font-size: 12px; cursor: pointer; font-weight: 700;" onclick="switchTab('benefits')">View All</button>
                </div>
                ${renderTable(allData.joins.slice(0, 5))}
            </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                    <h3>Latest Tournament Registrations</h3>
                    <button style="background: none; border: none; color: #dc2626; font-size: 12px; cursor: pointer; font-weight: 700;" onclick="switchTab('tournament')">View All</button>
                </div>
                ${renderTable(allData.tournaments.slice(0, 3))}
            </div>
            
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                    <h3>Latest Scrims Registrations</h3>
                    <button style="background: none; border: none; color: #dc2626; font-size: 12px; cursor: pointer; font-weight: 700;" onclick="switchTab('scrims')">View All</button>
                </div>
                ${renderTable(allData.scrims.slice(0, 3))}
            </div>
            
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                    <h3>Recent Notifications</h3>
                    <button style="background: none; border: none; color: #dc2626; font-size: 12px; cursor: pointer; font-weight: 700;" onclick="switchTab('notifications')">View All</button>
                </div>
                <div>
                    ${renderRecentNotifications()}
                </div>
            </div>
        </div>
    `;
}

function renderTable(entries) {
    if (!entries.length) return '<p class="no-entries">No entries found.</p>';
    
    return `
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                                <th>Team Name</th>
                        <th>Captain / IGL</th>
                        <th>Registered On</th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${entries.map((e, i) => `
                        <tr>
                            <td>${String(i + 1).padStart(2, '0')}</td>
                            <td><strong>${e.teamName || e.managerIgn || e.ign || '—'}</strong></td>
                            <td>${e.captainName || e.managerIgn || e.captainIGN || e.ign || '—'}</td>
                            <td>${e.createdAt ? new Date(e.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                            <td>${getBadge(e.status)}</td>
                            <td><button class="btn btn-primary" style="padding: 6px 14px;" onclick="openEntryModal('${e.id}', '${getEntryType(e)}')">View</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderTournamentTab() {
    const filtered = filterEntries(allData.tournaments);
    return `
        <div class="filter-wrapper">
            <div class="filter-info">
                <h2>Tournament Registrations</h2>
                <p style="color: #555; font-size: 13px;">${allData.tournaments.length} total entries</p>
            </div>
            <select onchange="filterStatus = this.value; renderCurrentTab();">
                <option value="All">All</option>
                <option value="Pending">Pending</option>
                <option value="Accepted">Accepted</option>
                <option value="Rejected">Rejected</option>
            </select>
        </div>
        <div class="card">${renderTable(filtered)}</div>
    `;
}

function renderScrrimsTab() {
    const filtered = filterEntries(allData.scrims);
    return `
        <div class="filter-wrapper">
            <div class="filter-info">
                <h2>Scrims Registrations</h2>
                <p style="color: #555; font-size: 13px;">${allData.scrims.length} total entries</p>
            </div>
            <select onchange="filterStatus = this.value; renderCurrentTab();">
                <option value="All">All</option>
                <option value="Pending">Pending</option>
                <option value="Accepted">Accepted</option>
                <option value="Rejected">Rejected</option>
            </select>
        </div>
        <div class="card">${renderTable(filtered)}</div>
    `;
}

function renderJoinApplicationsTab() {
    const filtered = filterStatus === 'All'
        ? allData.joins
        : allData.joins.filter(entry => (entry.status || 'Pending') === filterStatus);

    const pendingCount = allData.joins.filter(entry => !entry.status || entry.status === 'Pending').length;
    const cardsHtml = filtered.length === 0
        ? '<p class="no-entries">No join applications found.</p>'
        : filtered.map((join) => {
            const statusColor = join.status === 'Accepted' ? '#22c55e' : join.status === 'Rejected' ? '#ef4444' : '#f59e0b';
            return `
                <div style="padding: 16px; border: 1px solid #1e1e2e; border-radius: 12px; background: #0a0a14; display: grid; gap: 12px; margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;">
                        <div>
                            <p style="margin: 0; color: #fff; font-weight: 800;">${escapeHTML(join.teamName || join.managerIgn || '—')}</p>
                            <p style="margin: 4px 0 0; color: #666; font-size: 12px;">${escapeHTML(join.managerIgn || '—')} • ${escapeHTML(join.teamRegion || '—')}</p>
                        </div>
                        <span style="padding: 4px 10px; border-radius: 999px; background: rgba(255,255,255,0.06); color: ${statusColor}; font-size: 11px; font-weight: 700;">${join.status || 'Pending'}</span>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; color: #aaa; font-size: 13px;">
                        <div><strong style="color:#fff;">Players:</strong> ${join.totalPlayers || '—'}</div>
                        <div><strong style="color:#fff;">Contact:</strong> ${escapeHTML(join.whatsappContact || '—')}</div>
                        <div><strong style="color:#fff;">Email:</strong> ${escapeHTML(join.emailAddress || '—')}</div>
                        <div><strong style="color:#fff;">Prev Org:</strong> ${escapeHTML(join.previousOrganization || '—')}</div>
                    </div>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        ${join.status !== 'Accepted' ? `<button onclick="updateJoinStatus('${join.id}', 'Accepted')" style="padding: 8px 12px; background: #16a34a; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 700;">✅ Accept</button>` : ''}
                        ${join.status !== 'Rejected' ? `<button onclick="updateJoinStatus('${join.id}', 'Rejected')" style="padding: 8px 12px; background: #dc2626; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 700;">❌ Reject</button>` : ''}
                        ${join.status !== 'Pending' ? `<button onclick="updateJoinStatus('${join.id}', 'Pending')" style="padding: 8px 12px; background: #f59e0b; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 700;">⏳ Pending</button>` : ''}
                        <button onclick="viewJoinEntry('${join.id}')" style="padding: 8px 12px; background: #3b82f6; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 700;">👁️ View</button>
                        <button onclick="deleteJoinEntry('${join.id}')" style="padding: 8px 12px; background: transparent; border: 1px solid #dc2626; color: #dc2626; border-radius:8px; cursor:pointer; font-weight:700;">🗑️ Delete</button>
                    </div>
                </div>`;
        }).join('');

    return `
        <div class="filter-wrapper">
            <div class="filter-info">
                <h2>Join Applications</h2>
                <p style="color: #555; font-size: 13px;">${allData.joins.length} total applications • ${pendingCount} pending</p>
            </div>
            <select onchange="filterStatus = this.value; renderCurrentTab();">
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Accepted">Accepted</option>
                <option value="Rejected">Rejected</option>
            </select>
        </div>
        <div class="card">
            ${allData.joins.length > 0 ? `<div style="display:flex; justify-content:flex-end; margin-bottom:12px;"><button onclick="deleteAllJoinEntries()" class="btn btn-secondary" style="background: transparent; border-color: #dc2626; color: #dc2626;">Delete All</button></div>` : ''}
            ${cardsHtml}
        </div>
    `;
}

function renderBenefitsTab() {
    return renderJoinApplicationsTab();
}

async function updateJoinStatus(joinId, status) {
    try {
        await update(ref(database, `applications/${joinId}`), { status });
        const entry = allData.joins.find(item => item.id === joinId);
        if (entry?.userId) {
            await push(ref(database, `notifications/${entry.userId}`), {
                message: `Your join application status has been updated to ${status}.`,
                status,
                type: 'join_status',
                createdAt: new Date().toISOString()
            });
        }
        allData.joins = allData.joins.map(item => item.id === joinId ? { ...item, status } : item);
        showSuccessModal('Status Updated', `Application marked as ${status}.`);
        renderCurrentTab();
    } catch (err) {
        console.error('Error updating join status:', err);
        showErrorModal('Update Failed', 'Could not update the application status.');
    }
}

function ensureJoinDetailsModal() {
    if (document.getElementById('joinDetailsModal')) return;

    document.body.insertAdjacentHTML('beforeend', `
        <div id="joinDetailsModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.72); z-index:9999; align-items:flex-start; justify-content:center; padding:40px 20px; overflow:auto;">
            <div style="width:min(640px, 100%); max-height:calc(100vh - 80px); background:#0a0a14; border:1px solid #2a2a3a; border-radius:16px; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,0.45); display:flex; flex-direction:column;">
                <div style="padding:18px 20px; border-bottom:1px solid #1e1e2e; background:linear-gradient(135deg, rgba(220,38,38,0.15), rgba(10,10,20,0.95)); position:relative;">
                    <h3 style="margin:0; color:#fff; font-size:18px;">Join Application Details</h3>
                    <button type="button" onclick="closeJoinDetailsModal()" aria-label="Close" style="position:absolute; right:12px; top:12px; background:transparent; border:none; color:#fff; font-size:20px; cursor:pointer;">×</button>
                </div>
                <div id="joinDetailsModalBody" style="padding:20px; color:#ddd; line-height:1.7; overflow:auto; flex:1;">
                </div>
                <div style="padding:16px 20px; border-top:1px solid #1e1e2e; display:flex; justify-content:flex-end; gap:10px;">
                    <button type="button" onclick="closeJoinDetailsModal()" style="padding:10px 16px; background:transparent; border:1px solid #2a2a3a; color:#fff; border-radius:10px; cursor:pointer;">Close</button>
                </div>
            </div>
        </div>
    `);
}

function closeJoinDetailsModal() {
    const modal = document.getElementById('joinDetailsModal');
    if (modal) modal.style.display = 'none';
}

function viewJoinEntry(joinId) {
    const entry = allData.joins.find(item => item.id === joinId);
    if (!entry) return;

    ensureJoinDetailsModal();
    const body = document.getElementById('joinDetailsModalBody');
    if (!body) return;

    const detailRows = [
        ['Team Name', entry.teamName],
        ['Manager IGN', entry.managerIgn],
        ['Manager Full Name', entry.managerFullName],
        ['Region', entry.teamRegion],
        ['Players', entry.totalPlayers],
        ['Previous Organization', entry.previousOrganization],
        ['Tournament Experience', entry.tournamentExperience],
        ['Player UID', entry.bestTournamentResult],
        ['Preferred Play Time', entry.preferredPlayTime],
        ['WhatsApp Contact', entry.whatsappContact],
        ['Email Address', entry.emailAddress],
        ['Status', entry.status || 'Pending'],
        ['Submitted At', entry.createdAt ? new Date(entry.createdAt).toLocaleString('en-IN') : '—']
    ];

    body.innerHTML = `
        <div style="display:grid; gap:10px;">
            ${detailRows.map(([label, value]) => `
                <div style="background:#0f0f0f; border:1px solid #1e1e2e; border-radius:10px; padding:10px 12px;">
                    <div style="color:#666; font-size:11px; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:4px;">${escapeHTML(label)}</div>
                    <div style="color:#fff; font-size:14px; word-break:break-word;">${escapeHTML(value || '—')}</div>
                </div>
            `).join('')}
        </div>
    `;

    document.getElementById('joinDetailsModal').style.display = 'flex';
}

function renderContactTab() {
    const filtered = filterEntries(allData.contacts);
    return `
        <div class="filter-wrapper">
            <div class="filter-info">
                <h2>Contact Requests</h2>
                <p style="color: #555; font-size: 13px;">${allData.contacts.length} total messages</p>
            </div>
            <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                ${allData.contacts.length > 0 ? `<button class="btn btn-secondary" style="padding:8px 14px; border-color:#dc2626; color:#dc2626;" onclick="deleteAllContactEntries()">Delete All</button>` : ''}
                <select onchange="filterStatus = this.value; renderCurrentTab();">
                    <option value="All">All</option>
                    <option value="Pending">Pending</option>
                    <option value="Replied">Replied</option>
                    <option value="Closed">Closed</option>
                </select>
            </div>
        </div>
        <div class="card">
            ${filtered.length === 0 ? '<p class="no-entries">No contact requests yet.</p>' : filtered.map((entry) => `
                <div style="padding: 16px 0; border-bottom: 1px solid #13131f; display: grid; gap: 10px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
                        <div>
                            <p style="color:#fff; font-weight:700; margin:0;">${escapeHTML(entry.fullName || '—')}</p>
                            <p style="color:#666; font-size:12px; margin:4px 0 0;">Contact ID: ${escapeHTML(entry.id || '—')}</p>
                        </div>
                        <select onchange="updateContactStatus('${entry.id}', this.value)" style="padding:8px 10px; background:#0a0a14; border:1px solid #1e1e2e; color:#fff; border-radius:8px;">
                            <option value="Pending" ${entry.status === 'Pending' ? 'selected' : ''}>Pending</option>
                            <option value="Replied" ${entry.status === 'Replied' ? 'selected' : ''}>Replied</option>
                            <option value="Closed" ${entry.status === 'Closed' ? 'selected' : ''}>Closed</option>
                        </select>
                    </div>
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:10px; color:#aaa; font-size:13px;">
                        <div><strong style="color:#fff;">Mobile:</strong> ${escapeHTML(entry.mobileNumber || '—')}</div>
                        <div><strong style="color:#fff;">Email:</strong> ${escapeHTML(entry.emailAddress || '—')}</div>
                        <div><strong style="color:#fff;">Organization:</strong> ${escapeHTML(entry.organization || '—')}</div>
                        <div><strong style="color:#fff;">Subject:</strong> ${escapeHTML(entry.subject || '—')}</div>
                        <div><strong style="color:#fff;">Category:</strong> ${escapeHTML(entry.category || '—')}</div>
                    </div>
                    <div style="color:#ccc; font-size:13px; line-height:1.7; background:#0a0a14; padding:12px; border-radius:10px; border:1px solid #1e1e2e;">
                        <strong style="color:#fff;">Message:</strong><br>${escapeHTML(entry.message || '—')}
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; color:#666; font-size:12px;">
                        <span>${entry.createdAt ? new Date(entry.createdAt).toLocaleString('en-IN') : '—'}</span>
                        <div style="display:flex; gap:8px; flex-wrap:wrap;">
                            <button class="btn btn-primary" style="padding:8px 14px;" onclick="openContactReplyModal('${entry.id}')">Reply</button>
                            <button class="btn btn-secondary" style="padding:8px 14px; border-color:#dc2626; color:#dc2626;" onclick="deleteContactEntry('${entry.id}')">Delete</button>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderNotificationsTab() {
    return `
        <h2 style="color: #fff; font-weight: 900; font-size: 20px; margin-bottom: 24px;">Notifications</h2>
        <div class="card">
            <h3>📢 Broadcast to All Users</h3>
            <p class="card-desc">Send a message to all <strong style="color: #fff;">${allData.allUsers.length}</strong> registered users simultaneously.</p>
            <textarea id="broadcastMsg" placeholder="Type your broadcast message…" rows="4"></textarea>
            <button class="btn btn-primary" onclick="sendBroadcast()">📢 Send to ${allData.allUsers.length} Users</button>
        </div>
        
        <div class="card" style="background: rgba(59, 130, 246, 0.05); border-color: rgba(59, 130, 246, 0.2);">
            <h3 style="color: #60a5fa;">💡 Personal Notification</h3>
            <p class="card-desc">To send a personal notification to a specific user, open their entry from the <strong style="color: #fff;">Tournament</strong>, <strong style="color: #fff;">Scrims</strong>, or <strong style="color: #fff;">Join Requests</strong> tabs and click <strong style="color: #60a5fa;">📩 Send Notification</strong> inside the View modal.</p>
        </div>
    `;
}

function renderUpcomingTournamentTab() {
    return `
        <div class="content-header">
            <h1>Upcoming Tournament</h1>
            <p>Upload an image for the website upcoming tournament section and manage banner visibility.</p>
        </div>

        <div class="card" style="display: grid; gap: 16px;">
            <div>
                <h3 style="color: #fff; font-weight: 700; margin-bottom: 6px; font-size: 15px;">📷 Upload Banner Image</h3>
                <p style="color: #555; font-size: 13px; margin: 0;">Click below to choose an image from your device. It will appear in the website's upcoming tournament section.</p>
            </div>

            <div style="display: grid; gap: 12px;">
                <label style="color: #aaa; font-size: 13px; display: block;">Choose file from device</label>
                <input type="file" id="upcomingTournamentBannerFile" accept="image/*" style="color: #fff;">

                <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                    <button onclick="saveUpcomingTournamentBanner()" style="padding: 10px 18px; background: #dc2626; color: #fff; border: none; border-radius: 8px; font-weight: 700; cursor: pointer;">Save Banner</button>
                    <button onclick="deleteUpcomingTournamentBanner()" style="padding: 10px 18px; background: #374151; color: #fff; border: none; border-radius: 8px; font-weight: 700; cursor: pointer;">Delete Banner</button>
                </div>

                ${allData.upcomingTournamentBannerImage ? `
                    <div style="margin-top: 8px;">
                        <p style="color: #aaa; font-size: 12px; margin-bottom: 8px;">Current preview:</p>
                        <img src="${escapeHTML(allData.upcomingTournamentBannerImage)}" alt="Upcoming tournament banner preview" style="max-width: 100%; max-height: 220px; object-fit: cover; border-radius: 12px; border: 1px solid #1e1e2e;">
                    </div>
                ` : '<p style="color: #666; font-size: 13px; margin: 0;">No banner uploaded yet.</p>'}
            </div>
        </div>
    `;
}

function renderSettingsTab() {
    return `
        <h2 style="color: #fff; font-weight: 900; font-size: 20px; margin-bottom: 24px;">Website Settings</h2>
        
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h3 style="color: #fff; font-weight: 700; margin-bottom: 4px; font-size: 15px;">🏆 Tournament Registration Form</h3>
                    <p style="color: #555; font-size: 13px;">${allData.tournamentOn ? 'Form is LIVE — users can register.' : "Showing 'COMING SOON'."}</p>
                </div>
                <div style="display: flex; align-items: center; gap: 12px; flex-shrink: 0; margin-left: 20px;">
                    <span style="color: ${allData.tournamentOn ? '#22c55e' : '#ef4444'}; font-weight: 700; font-size: 12px;">${allData.tournamentOn ? 'ON' : 'OFF'}</span>
                    <button onclick="toggleSetting('tournament')" style="width: 52px; height: 26px; border-radius: 13px; border: none; background: ${allData.tournamentOn ? '#22c55e' : '#374151'}; cursor: pointer; position: relative;">
                        <div style="width: 20px; height: 20px; border-radius: 50%; background: #fff; position: absolute; top: 3px; left: ${allData.tournamentOn ? '29px' : '3px'}; transition: 0.3s;"></div>
                    </button>
                </div>
            </div>
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #1e1e2e; display: grid; gap: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px;">
                    <div>
                        <h4 style="color: #fff; font-size: 13px; margin: 0 0 4px 0;">Show banner</h4>
                        <p style="color: #555; font-size: 12px; margin: 0;">If ON, image will appear above the tournament registration form.</p>
                    </div>
                    <button onclick="toggleBannerSetting('tournament')" style="width: 52px; height: 26px; border-radius: 13px; border: none; background: ${allData.tournamentBannerEnabled ? '#22c55e' : '#374151'}; cursor: pointer; position: relative;">
                        <div style="width: 20px; height: 20px; border-radius: 50%; background: #fff; position: absolute; top: 3px; left: ${allData.tournamentBannerEnabled ? '29px' : '3px'}; transition: 0.3s;"></div>
                    </button>
                </div>
                ${allData.tournamentBannerEnabled ? `
                    <div style="display: grid; gap: 10px;">
                        <label style="color: #aaa; font-size: 12px;">Choose file from device</label>
                        <input type="file" id="tournamentBannerFile" accept="image/*" style="color: #fff;">
                        <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                            <button onclick="saveTournamentBanner()" style="padding: 8px 14px; background: #dc2626; color: #fff; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 12px;">Save Banner</button>
                            <button onclick="deleteTournamentBanner()" style="padding: 8px 14px; background: #374151; color: #fff; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 12px;">Delete Banner</button>
                        </div>
                        ${allData.tournamentBannerImage ? `<img src="${escapeHTML(allData.tournamentBannerImage)}" alt="Tournament banner preview" style="max-width: 100%; max-height: 180px; object-fit: cover; border-radius: 10px; border: 1px solid #1e1e2e;">` : '<p style="color: #666; font-size: 12px; margin: 0;">No banner uploaded yet.</p>'}
                    </div>
                ` : ''}
            </div>
        </div>
        
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h3 style="color: #fff; font-weight: 700; margin-bottom: 4px; font-size: 15px;">⚔️ Scrim Booking Form</h3>
                    <p style="color: #555; font-size: 13px;">${allData.scrimOn ? 'Form is LIVE — teams can book.' : "Showing 'COMING SOON'."}</p>
                </div>
                <div style="display: flex; align-items: center; gap: 12px; flex-shrink: 0; margin-left: 20px;">
                    <span style="color: ${allData.scrimOn ? '#22c55e' : '#ef4444'}; font-weight: 700; font-size: 12px;">${allData.scrimOn ? 'ON' : 'OFF'}</span>
                    <button onclick="toggleSetting('scrim')" style="width: 52px; height: 26px; border-radius: 13px; border: none; background: ${allData.scrimOn ? '#22c55e' : '#374151'}; cursor: pointer; position: relative;">
                        <div style="width: 20px; height: 20px; border-radius: 50%; background: #fff; position: absolute; top: 3px; left: ${allData.scrimOn ? '29px' : '3px'}; transition: 0.3s;"></div>
                    </button>
                </div>
            </div>
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #1e1e2e; display: grid; gap: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px;">
                    <div>
                        <h4 style="color: #fff; font-size: 13px; margin: 0 0 4px 0;">Show banner</h4>
                        <p style="color: #555; font-size: 12px; margin: 0;">If ON, image will appear above the scrims registration form.</p>
                    </div>
                    <button onclick="toggleBannerSetting('scrim')" style="width: 52px; height: 26px; border-radius: 13px; border: none; background: ${allData.scrimBannerEnabled ? '#22c55e' : '#374151'}; cursor: pointer; position: relative;">
                        <div style="width: 20px; height: 20px; border-radius: 50%; background: #fff; position: absolute; top: 3px; left: ${allData.scrimBannerEnabled ? '29px' : '3px'}; transition: 0.3s;"></div>
                    </button>
                </div>
                ${allData.scrimBannerEnabled ? `
                    <div style="display: grid; gap: 10px;">
                        <label style="color: #aaa; font-size: 12px;">Choose file from device</label>
                        <input type="file" id="scrimBannerFile" accept="image/*" style="color: #fff;">
                        <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                            <button onclick="saveScrimBanner()" style="padding: 8px 14px; background: #dc2626; color: #fff; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 12px;">Save Banner</button>
                            <button onclick="deleteScrimBanner()" style="padding: 8px 14px; background: #374151; color: #fff; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 12px;">Delete Banner</button>
                        </div>
                        ${allData.scrimBannerImage ? `<img src="${escapeHTML(allData.scrimBannerImage)}" alt="Scrims banner preview" style="max-width: 100%; max-height: 180px; object-fit: cover; border-radius: 10px; border: 1px solid #1e1e2e;">` : '<p style="color: #666; font-size: 12px; margin: 0;">No banner uploaded yet.</p>'}
                    </div>
                ` : ''}
            </div>
        </div>

        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h3 style="color: #fff; font-weight: 700; margin-bottom: 4px; font-size: 15px;">🚀 Team Recruitment Form</h3>
                    <p style="color: #555; font-size: 13px;">${allData.joinOn ? 'Form is LIVE — teams can apply.' : "Showing 'COMING SOON'."}</p>
                </div>
                <div style="display: flex; align-items: center; gap: 12px; flex-shrink: 0; margin-left: 20px;">
                    <span style="color: ${allData.joinOn ? '#22c55e' : '#ef4444'}; font-weight: 700; font-size: 12px;">${allData.joinOn ? 'ON' : 'OFF'}</span>
                    <button onclick="toggleSetting('join')" style="width: 52px; height: 26px; border-radius: 13px; border: none; background: ${allData.joinOn ? '#22c55e' : '#374151'}; cursor: pointer; position: relative;">
                        <div style="width: 20px; height: 20px; border-radius: 50%; background: #fff; position: absolute; top: 3px; left: ${allData.joinOn ? '29px' : '3px'}; transition: 0.3s;"></div>
                    </button>
                </div>
            </div>
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #1e1e2e; display: grid; gap: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px;">
                    <div>
                        <h4 style="color: #fff; font-size: 13px; margin: 0 0 4px 0;">Show banner</h4>
                        <p style="color: #555; font-size: 12px; margin: 0;">If ON, image will appear above the join recruitment form.</p>
                    </div>
                    <button onclick="toggleBannerSetting('join')" style="width: 52px; height: 26px; border-radius: 13px; border: none; background: ${allData.joinBannerEnabled ? '#22c55e' : '#374151'}; cursor: pointer; position: relative;">
                        <div style="width: 20px; height: 20px; border-radius: 50%; background: #fff; position: absolute; top: 3px; left: ${allData.joinBannerEnabled ? '29px' : '3px'}; transition: 0.3s;"></div>
                    </button>
                </div>
                ${allData.joinBannerEnabled ? `
                    <div style="display: grid; gap: 10px;">
                        <label style="color: #aaa; font-size: 12px;">Choose file from device</label>
                        <input type="file" id="joinBannerFile" accept="image/*" style="color: #fff;">
                        <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                            <button onclick="saveJoinBanner()" style="padding: 8px 14px; background: #dc2626; color: #fff; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 12px;">Save Banner</button>
                            <button onclick="deleteJoinBanner()" style="padding: 8px 14px; background: #374151; color: #fff; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 12px;">Delete Banner</button>
                        </div>
                        ${allData.joinBannerImage ? `<img src="${escapeHTML(allData.joinBannerImage)}" alt="Join banner preview" style="max-width: 100%; max-height: 180px; object-fit: cover; border-radius: 10px; border: 1px solid #1e1e2e;">` : '<p style="color: #666; font-size: 12px; margin: 0;">No banner uploaded yet.</p>'}
                    </div>
                ` : ''}
            </div>
        </div>
        
        <div class="card">
            <h3 style="color:#fff; font-size:16px; margin-bottom:8px;">🔐 Room ID-Password Setting</h3>
            <p style="color:#bbb; font-size:13px; margin-top:0;">Define room credentials and map them to forms shown to users after they submit.</p>
            <div style="display:grid; gap:10px; margin-top:12px;">
                <label style="color:#aaa; font-size:13px;">Select preset to edit</label>
                <select id="roomPresetSelect" style="padding:8px 10px; background:#0a0a14; border:1px solid #1e1e2e; color:#fff; border-radius:8px;">
                    <option value="orgTrial">Organization Trial Room ID and Password</option>
                    <option value="tournament">Tournament Room ID and Password</option>
                    <option value="scrim">Scrim Room ID and Password</option>
                </select>
                <label style="color:#aaa; font-size:13px;">ROOM ID INFORMATION</label>
                <input id="roomIdInput" type="text" style="padding:8px; background:#0a0a14; border:1px solid #1e1e2e; color:#fff; border-radius:8px;">
                <label style="color:#aaa; font-size:13px;">Total Groups</label>
                <input id="roomGroupsInput" type="text" placeholder="e.g., 3" style="padding:8px; background:#0a0a14; border:1px solid #1e1e2e; color:#fff; border-radius:8px;">
                <label style="color:#aaa; font-size:13px;">Time & Date</label>
                <input id="roomDatetimeInput" type="text" placeholder="e.g., 2026-07-20 18:00" style="padding:8px; background:#0a0a14; border:1px solid #1e1e2e; color:#fff; border-radius:8px;">
                <label style="color:#aaa; font-size:13px;">Rules</label>
                <textarea id="roomRulesInput" rows="3" style="padding:8px; background:#0a0a14; border:1px solid #1e1e2e; color:#fff; border-radius:8px;"></textarea>
                <div style="display:flex; gap:8px;">
                    <button onclick="saveRoomSetting()" class="btn btn-primary">Save Room Setting</button>
                    <button onclick="deleteRoomSetting()" class="btn btn-secondary" style="background:transparent; border-color:#dc2626; color:#dc2626;">Delete Setting</button>
                </div>
                <hr style="border-color:#1e1e2e; margin-top:6px; margin-bottom:6px;">
                <h4 style="color:#fff; margin:0;">Map preset to forms</h4>
                <div style="display:grid; gap:8px; margin-top:8px;">
                    <label style="color:#aaa; font-size:13px;">Join Form Mapping</label>
                    <select id="joinRoomMappingSelect" style="padding:8px; background:#0a0a14; border:1px solid #1e1e2e; color:#fff; border-radius:8px;">
                        <option value="orgTrial">Organization Trial</option>
                        <option value="tournament">Tournament</option>
                        <option value="scrim">Scrim</option>
                    </select>
                    <label style="color:#aaa; font-size:13px;">Tournament Form Mapping</label>
                    <select id="tournamentRoomMappingSelect" style="padding:8px; background:#0a0a14; border:1px solid #1e1e2e; color:#fff; border-radius:8px;">
                        <option value="orgTrial">Organization Trial</option>
                        <option value="tournament">Tournament</option>
                        <option value="scrim">Scrim</option>
                    </select>
                    <label style="color:#aaa; font-size:13px;">Scrim Form Mapping</label>
                    <select id="scrimRoomMappingSelect" style="padding:8px; background:#0a0a14; border:1px solid #1e1e2e; color:#fff; border-radius:8px;">
                        <option value="orgTrial">Organization Trial</option>
                        <option value="tournament">Tournament</option>
                        <option value="scrim">Scrim</option>
                    </select>
                    <div style="display:flex; gap:8px;"><button onclick="saveRoomMappings()" class="btn btn-primary">Save Mappings</button></div>
                </div>
            </div>
        </div>
        
        <div class="card" style="background: rgba(220, 38, 38, 0.04); border-color: rgba(220, 38, 38, 0.2);">
            <h3 style="color: #dc2626;">ℹ️ How toggles work</h3>
            <ul style="padding-left: 18px;">
                <li style="color: #888; font-size: 13px; line-height: 2;">Toggle ON → form becomes visible on the website immediately</li>
                <li style="color: #888; font-size: 13px; line-height: 2;">Toggle OFF → page shows 'COMING SOON'</li>
                <li style="color: #888; font-size: 13px; line-height: 2;">Changes take effect in real-time — no page reload needed</li>
                <li style="color: #888; font-size: 13px; line-height: 2;">All submissions appear in Tournament / Scrims tabs</li>
                <li style="color: #888; font-size: 13px; line-height: 2;">Accept / Reject auto-sends a notification to the user</li>
                <li style="color: #888; font-size: 13px; line-height: 2;">📩 Send Notification → personal message to a specific user via View modal</li>
            </ul>
        </div>
    `;
}

function renderHeroTab() {
    return `
        <div class="content-header">
            <h1>Edit Hero Section</h1>
            <p>Update the homepage hero content that displays on the public website.</p>
        </div>
        <div class="card" style="display: grid; gap: 16px;">
            <div style="display: grid; gap: 12px;">
                <label style="color: #aaa; font-size: 13px;">Main Heading</label>
                <input type="text" id="heroTitle" value="${escapeHTML(heroDraft.title)}" style="padding: 12px 14px; border: 1px solid #1e1e2e; border-radius: 10px; background: #0a0a14; color: #fff; outline: none;">
                <label style="color: #aaa; font-size: 13px;">Subtitle</label>
                <input type="text" id="heroSubtitle" value="${escapeHTML(heroDraft.subtitle)}" style="padding: 12px 14px; border: 1px solid #1e1e2e; border-radius: 10px; background: #0a0a14; color: #fff; outline: none;">
                <label style="color: #aaa; font-size: 13px;">Description</label>
                <textarea id="heroDescription" rows="4" style="padding: 12px 14px; border: 1px solid #1e1e2e; border-radius: 10px; background: #0a0a14; color: #fff; outline: none;">${escapeHTML(heroDraft.description)}</textarea>
                <label style="color: #aaa; font-size: 13px;">Button Text</label>
                <input type="text" id="heroButtonText" value="${escapeHTML(heroDraft.buttonText)}" style="padding: 12px 14px; border: 1px solid #1e1e2e; border-radius: 10px; background: #0a0a14; color: #fff; outline: none;">
                <label style="color: #aaa; font-size: 13px;">Button Link</label>
                <input type="text" id="heroButtonLink" value="${escapeHTML(heroDraft.buttonLink)}" style="padding: 12px 14px; border: 1px solid #1e1e2e; border-radius: 10px; background: #0a0a14; color: #fff; outline: none;">
            </div>
            <button class="btn btn-primary" id="saveHeroBtn">Save Hero Section</button>
        </div>
    `;
}

function renderTeamTab() {
    return `
        <div class="content-header">
            <h1>Our Lineup</h1>
            <p>Manage the public lineup entries shown on the website.</p>
        </div>
        <div class="card" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div>
                <h2 style="margin: 0; font-size: 18px; color: #fff;">Our Lineup Manager</h2>
                <p style="margin: 6px 0 0; color: #555; font-size: 13px;">Create, edit, and publish lineup entries for the public roster page.</p>
            </div>
            <div style="display:flex; align-items:center; gap:10px; flex-wrap: wrap;">
                <label style="color:#aaa; font-size:13px;">Roster Size</label>
                <select id="rosterSizeSelect" style="padding:8px 12px; background:#0a0a14; border:1px solid #1e1e2e; border-radius:10px; color:#fff;">
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                </select>
            </div>
            <div style="display:flex; align-items:center; gap:10px; flex-wrap: wrap;">
                ${allData.lineup.length > 0 ? `<button class="btn btn-secondary" style="background: transparent; border-color: #dc2626; color: #dc2626;" onclick="deleteAllLineupEntries()">Delete All</button>` : ''}
                <button class="btn btn-primary" id="toggleLineupFormBtn">${teamFormVisible ? 'Cancel' : 'Create Our Lineup'}</button>
            </div>
        </div>
        ${teamFormVisible ? `
        <div class="card" style="display: grid; gap: 14px; margin-top: 16px;">
            <div style="display: grid; gap: 12px;">
                <label style="color: #aaa; font-size: 13px;">Team Name</label>
                <input type="text" id="lineupTeamName" value="${escapeHTML(rosterDraft.teamName || lineupDraft.teamName)}" placeholder="Team Name" style="padding: 12px 14px; border: 1px solid #1e1e2e; border-radius: 10px; background: #0a0a14; color: #fff; outline: none;">
                <label style="color: #aaa; font-size: 13px;">Logo</label>
                <input type="file" id="lineupLogoFile" accept="image/*" style="color: #fff;">
                ${rosterDraft.logo || lineupDraft.logo ? `<img id="lineupLogoPreview" src="${escapeHTML(rosterDraft.logo || lineupDraft.logo)}" alt="Logo preview" style="width: 96px; height: 96px; object-fit: cover; border-radius: 14px; border: 1px solid #1e1e2e;">` : '<img id="lineupLogoPreview" style="display:none; width:96px; height:96px;">'}
                <label style="color: #aaa; font-size: 13px;">Players (Edit the rows below)</label>
                <div style="overflow:auto;">
                    <table style="width:100%; border-collapse:collapse; min-width:720px;">
                        <thead>
                            <tr style="color:#777; font-size:12px; text-align:left;">
                                <th style="padding:10px 8px; width:64px;">Sr No.</th>
                                <th style="padding:10px 8px;">Player IGN</th>
                                <th style="padding:10px 8px;">Player UID</th>
                                <th style="padding:10px 8px;">Role</th>
                                <th style="padding:10px 8px;">Joining Date</th>
                                <th style="padding:10px 8px;">Status</th>
                                <th style="padding:10px 8px;">Profile Image</th>
                            </tr>
                        </thead>
                        <tbody id="rosterEditorBody">
                        </tbody>
                    </table>
                </div>
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button class="btn btn-primary" id="saveRosterBtn">Save Roster</button>
                <button class="btn btn-secondary" id="resetLineupBtn">Reset</button>
            </div>
        </div>
        ` : ''}
        <div class="card" style="margin-top: 16px;">
            <h3 style="margin-bottom: 14px;">${allData.lineup.length} Lineup ${allData.lineup.length === 1 ? 'Entry' : 'Entries'}</h3>
            ${allData.lineup.length === 0 ? '<p class="no-entries">No lineup entries yet.</p>' : renderLineupEntries(allData.lineup)}
        </div>
    `;
}

function renderLineupEntries(entries) {
    return entries.map((entry, i) => `
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 14px 0; border-bottom: 1px solid #13131f;">
            <div style="display: flex; align-items: center; gap: 14px; min-width: 0;">
                ${entry.logo ? `<img src="${escapeHTML(entry.logo)}" alt="${escapeHTML(entry.teamName || 'Logo')}" style="width: 54px; height: 54px; object-fit: cover; border-radius: 12px; border: 1px solid #2a2a3a;">` : '<div style="width: 54px; height: 54px; display: grid; place-items: center; border-radius: 12px; border: 1px solid #2a2a3a; background: #111; color: #dc2626; font-weight: 700;">PA</div>'}
                <div style="min-width: 0;">
                    <p style="margin: 0; color: #fff; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHTML(entry.teamName || '—')}</p>
                    <p style="margin: 6px 0 0; color: #777; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Sr No. ${escapeHTML(entry.serialNumber || '—')} • ${escapeHTML(entry.playerIgn || '—')} • ${escapeHTML(entry.role || '—')}</p>
                    <p style="margin: 4px 0 0; color: #666; font-size: 12px;">UID: ${escapeHTML(entry.playerUid || '—')} • Joined: ${escapeHTML(entry.joiningDate || '—')}</p>
                </div>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button class="btn btn-secondary" style="padding: 8px 14px;" onclick="startEditLineup('${entry.id}')">Edit</button>
                <button class="btn btn-secondary" style="padding: 8px 14px; border-color: #dc2626; color: #dc2626;" onclick="deleteLineupEntry('${entry.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

function bindCurrentTabEvents() {
    const saveHeroBtn = document.getElementById('saveHeroBtn');
    if (saveHeroBtn) {
        saveHeroBtn.addEventListener('click', saveHeroSection);
    }

    const toggleLineupBtn = document.getElementById('toggleLineupFormBtn');
    if (toggleLineupBtn) {
        toggleLineupBtn.addEventListener('click', () => {
            teamFormVisible = !teamFormVisible;
            if (!teamFormVisible) {
                resetLineupForm();
            }
            renderCurrentTab();
        });
    }

    const rosterSizeSelect = document.getElementById('rosterSizeSelect');
    if (rosterSizeSelect) {
        // initialize with current value
        rosterSizeSelect.value = String(allData.rosterSize || 5);
        rosterSizeSelect.addEventListener('change', async (e) => {
            const v = Number(e.target.value) || 5;
            try {
                await set(ref(database, 'settings/rosterSize'), v);
                showSuccessModal('Roster Size', 'Roster size saved: ' + v);
            } catch (err) {
                console.error('Error saving roster size:', err);
                showErrorModal('Save Error', 'Failed to save roster size.');
            }
        });
    }

    const saveLineupBtn = document.getElementById('saveLineupBtn');
    if (saveLineupBtn) {
        saveLineupBtn.addEventListener('click', handleLineupSubmit);
    }

    const saveRosterBtn = document.getElementById('saveRosterBtn');
    if (saveRosterBtn) {
        saveRosterBtn.addEventListener('click', handleRosterSave);
    }

    // Room settings UI initialization
    const roomPresetSelect = document.getElementById('roomPresetSelect');
    const roomIdInput = document.getElementById('roomIdInput');
    const roomGroupsInput = document.getElementById('roomGroupsInput');
    const roomDatetimeInput = document.getElementById('roomDatetimeInput');
    const roomRulesInput = document.getElementById('roomRulesInput');
    const joinMap = document.getElementById('joinRoomMappingSelect');
    const tourMap = document.getElementById('tournamentRoomMappingSelect');
    const scrimMap = document.getElementById('scrimRoomMappingSelect');

    function loadSelectedRoom() {
        const key = roomPresetSelect?.value || 'orgTrial';
        const data = (allData.roomSettings && allData.roomSettings[key]) || {};
        if (roomIdInput) roomIdInput.value = data.roomId || '';
        if (roomGroupsInput) roomGroupsInput.value = data.groups || (Array.isArray(data.groups) ? data.groups.join(', ') : '');
        if (roomDatetimeInput) roomDatetimeInput.value = data.datetime || '';
        if (roomRulesInput) roomRulesInput.value = data.rules || '';
    }

    if (roomPresetSelect) {
        roomPresetSelect.addEventListener('change', loadSelectedRoom);
        loadSelectedRoom();
    }

    if (joinMap) joinMap.value = (allData.roomMapping && allData.roomMapping.join) || 'orgTrial';
    if (tourMap) tourMap.value = (allData.roomMapping && allData.roomMapping.tournament) || 'tournament';
    if (scrimMap) scrimMap.value = (allData.roomMapping && allData.roomMapping.scrims) || 'scrim';

    const resetLineupBtn = document.getElementById('resetLineupBtn');
    if (resetLineupBtn) {
        resetLineupBtn.addEventListener('click', (e) => {
            e.preventDefault();
            resetLineupForm();
            renderCurrentTab();
        });
    }

    const logoFileInput = document.getElementById('lineupLogoFile');
    if (logoFileInput) {
        logoFileInput.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = () => {
                    rosterDraft.logo = reader.result;
                    lineupDraft.logo = reader.result;
                    const preview = document.getElementById('lineupLogoPreview');
                    if (preview) { preview.src = reader.result; preview.style.display = 'block'; }
                    renderCurrentTab();
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // populate roster editor body when form visible
    const rosterBody = document.getElementById('rosterEditorBody');
    if (rosterBody && teamFormVisible) {
        // build rows based on selected roster size
        const rosterSize = Number(allData.rosterSize || 5);
        const teamNameVal = rosterDraft.teamName || lineupDraft.teamName || '';
        // find existing entries for this team
        const teamEntries = allData.lineup.filter(e => (e.teamName || '').toString() === (teamNameVal || '').toString());
        rosterBody.innerHTML = '';
        for (let i = 1; i <= rosterSize; i++) {
            const existing = teamEntries.find(x => Number(x.serialNumber) === i) || {};
            rosterBody.insertAdjacentHTML('beforeend', `
                <tr>
                    <td style="padding:8px;"><input type="number" class="row-serial" value="${i}" readonly style="width:56px; background:#0a0a14; border:1px solid #1e1e2e; color:#fff; padding:8px; border-radius:6px;"></td>
                    <td style="padding:8px;"><input type="text" id="playerIgn_${i}" value="${escapeHTML(existing.playerIgn || '')}" placeholder="Player IGN" style="width:100%; padding:8px; background:#0a0a14; border:1px solid #1e1e2e; color:#fff; border-radius:6px;"></td>
                    <td style="padding:8px;"><input type="text" id="playerUid_${i}" value="${escapeHTML(existing.playerUid || existing.playerUid || '')}" placeholder="Player UID" style="width:100%; padding:8px; background:#0a0a14; border:1px solid #1e1e2e; color:#fff; border-radius:6px;"></td>
                    <td style="padding:8px;"><select id="role_${i}" style="width:100%; padding:8px; background:#0a0a14; border:1px solid #1e1e2e; color:#fff; border-radius:6px;">
                        <option value="IGL" ${existing.role==='IGL'?'selected':''}>IGL</option>
                        <option value="Rusher" ${existing.role==='Rusher'?'selected':''}>Rusher</option>
                        <option value="Support Rusher" ${existing.role==='Support Rusher'?'selected':''}>Support Rusher</option>
                        <option value="Sniper" ${existing.role==='Sniper'?'selected':''}>Sniper</option>
                        <option value="All Rounder" ${existing.role==='All Rounder'?'selected':''}>All Rounder</option>
                    </select></td>
                    <td style="padding:8px;"><input type="date" id="joining_${i}" value="${escapeHTML(existing.joiningDate || '')}" style="padding:8px; background:#0a0a14; border:1px solid #1e1e2e; color:#fff; border-radius:6px;"></td>
                    <td style="padding:8px;"><select id="status_${i}" style="padding:8px; background:#0a0a14; border:1px solid #1e1e2e; color:#fff; border-radius:6px;"><option value="Active" ${existing.status==='Active'?'selected':''}>Active</option><option value="Inactive" ${existing.status==='Inactive'?'selected':''}>Inactive</option></select></td>
                    <td style="padding:8px;"><input type="file" id="profileImg_${i}" accept="image/*" style="color:#fff;"><input type="hidden" id="entryId_${i}" value="${existing.id || ''}"></td>
                </tr>
            `);
        }

        // attach file change listeners to player profile inputs
        for (let i = 1; i <= rosterSize; i++) {
            const fileEl = document.getElementById(`profileImg_${i}`);
            if (fileEl) {
                fileEl.addEventListener('change', (ev) => {
                    const f = ev.target.files?.[0];
                    if (!f) return;
                    const r = new FileReader();
                    r.onload = () => {
                        // store as temp in DOM for saving
                        const hidden = document.createElement('input');
                        hidden.type = 'hidden';
                        hidden.id = `profileBase64_${i}`;
                        hidden.value = r.result || '';
                        document.getElementById('rosterEditorBody').appendChild(hidden);
                    };
                    r.readAsDataURL(f);
                });
            }
        }
    }

    // Handle metrics filter on analyse tab
    const metricFilter = document.getElementById('analyseMetricFilter');
    if (metricFilter) {
        metricFilter.addEventListener('change', (e) => {
            const selectedMetric = e.target.value;
            const metricsContainer = document.getElementById('metricsContainer');
            const chartBars = document.querySelectorAll('[data-chart-metric]');
            const chartSummary = document.getElementById('analyticsChartSummary');
            const metricLabels = {
                all: 'Showing all website metrics',
                joins: 'Showing join requests',
                tournaments: 'Showing tournament registrations',
                scrims: 'Showing scrims registrations',
                contacts: 'Showing contact messages',
                users: 'Showing total users'
            };

            if (metricsContainer) {
                const cards = metricsContainer.querySelectorAll('[data-metric]');
                cards.forEach(card => {
                    if (selectedMetric === 'all' || card.getAttribute('data-metric') === selectedMetric) {
                        card.style.display = 'flex';
                    } else {
                        card.style.display = 'none';
                    }
                });
            }

            chartBars.forEach(bar => {
                const key = bar.getAttribute('data-chart-metric');
                if (selectedMetric === 'all' || key === selectedMetric) {
                    bar.style.display = 'flex';
                } else {
                    bar.style.display = 'none';
                }
            });

            if (chartSummary) {
                chartSummary.textContent = metricLabels[selectedMetric] || metricLabels.all;
            }
        });
    }
}

function saveHeroSection() {
    const title = document.getElementById('heroTitle')?.value.trim() || allData.hero.title;
    const subtitle = document.getElementById('heroSubtitle')?.value.trim() || allData.hero.subtitle;
    const description = document.getElementById('heroDescription')?.value.trim() || allData.hero.description;
    const buttonText = document.getElementById('heroButtonText')?.value.trim() || allData.hero.buttonText;
    const buttonLink = document.getElementById('heroButtonLink')?.value.trim() || allData.hero.buttonLink;

    set(ref(database, 'hero'), {
        title,
        subtitle,
        description,
        buttonText,
        buttonLink
    }).then(() => {
        showSuccessModal('Hero Section', 'Hero section updated successfully.');
        teamFormVisible = false;
        renderCurrentTab();
    }).catch(err => {
        console.error('Error saving hero section:', err);
        showErrorModal('Save Error', 'Failed to save hero section.');
    });
}

async function deleteLineupEntry(entryId) {
    const entry = allData.lineup.find(e => e.id === entryId);
    if (!entry) return;

    if (!await showConfirmModal({
        title: 'Delete Lineup Entry',
        message: `Delete ${entry.playerIgn || entry.teamName || 'this lineup entry'}?`,
        confirmText: 'Delete',
        cancelText: 'Cancel'
    })) return;

    try {
        await remove(ref(database, `lineup/${entryId}`));
        showSuccessModal('Deleted', 'Lineup entry deleted.');
        renderCurrentTab();
    } catch (err) {
        console.error('Error deleting lineup entry:', err);
        showErrorModal('Delete Failed', 'Failed to delete lineup entry.');
    }
}

async function deleteAllLineupEntries() {
    if (!allData.lineup.length) {
        await showErrorModal('No Lineup Entries', 'There are no lineup entries to delete.');
        return;
    }

    if (!await showConfirmModal({
        title: 'Delete All Lineup Entries',
        message: `Delete all ${allData.lineup.length} lineup entries? This cannot be undone.`,
        confirmText: 'Delete All',
        cancelText: 'Cancel'
    })) return;

    try {
        await Promise.all(allData.lineup.map(entry => remove(ref(database, `lineup/${entry.id}`))));
        showSuccessModal('Deleted', 'All lineup entries deleted.');
        renderCurrentTab();
    } catch (err) {
        console.error('Error deleting all lineup entries:', err);
        showErrorModal('Delete Failed', 'Failed to delete all lineup entries.');
    }
}

async function deleteJoinEntry(joinId) {
    if (!joinId) return;
    const entry = allData.joins.find(j => j.id === joinId);
    const ok = confirm('Delete this join application? This cannot be undone.');
    if (!ok) return;
    try {
        await set(ref(database, `applications/${joinId}`), null);
        allData.joins = allData.joins.filter(j => j.id !== joinId);
        showSuccessModal('Deleted', 'Join application deleted.');
        renderCurrentTab();
    } catch (err) {
        console.error('Error deleting join entry:', err);
        showErrorModal('Delete Failed', 'Could not delete the join application.');
    }
}

async function deleteAllJoinEntries() {
    if (!allData.joins || !allData.joins.length) return;
    const ok = confirm(`Delete all ${allData.joins.length} join applications? This cannot be undone.`);
    if (!ok) return;
    try {
        await set(ref(database, 'applications'), null);
        allData.joins = [];
        showSuccessModal('Deleted', 'All join applications removed.');
        renderCurrentTab();
    } catch (err) {
        console.error('Error deleting all join entries:', err);
        showErrorModal('Delete Failed', 'Failed to delete all join applications.');
    }
}

function startEditLineup(entryId) {
    const entry = allData.lineup.find(e => e.id === entryId);
    if (!entry) return;
    // Open roster editor for this team
    rosterDraft = {
        teamName: entry.teamName || '',
        logo: entry.logo || '',
        players: []
    };
    lineupDraft.logo = entry.logo || '';
    teamFormVisible = true;
    renderCurrentTab();
}

function resetLineupForm() {
    editingLineupId = null;
    lineupDraft = {
        teamName: '',
        serialNumber: '',
        playerIgn: '',
        playerUid: '',
        role: '',
        joiningDate: '',
        logo: ''
    };
}

async function handleLineupSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('lineupTeamName')?.value.trim();
    const serial = document.getElementById('lineupSerialNumber')?.value.trim();
    const ign = document.getElementById('lineupPlayerIgn')?.value.trim();
    const uid = document.getElementById('lineupPlayerUid')?.value.trim();
    const role = document.getElementById('lineupRole')?.value.trim();
    const joiningDate = document.getElementById('lineupJoiningDate')?.value || '';
    const logo = lineupDraft.logo || '';

    if (!title || !serial || !ign || !uid || !role) {
        showErrorModal('Missing Fields', 'Please fill all required fields.');
        return;
    }

    const payload = {
        teamName: title,
        serialNumber: serial,
        playerIgn: ign,
        playerUid: uid,
        role,
        joiningDate,
        logo,
        createdAt: new Date().toISOString()
    };

    try {
        if (editingLineupId) {
            await update(ref(database, `lineup/${editingLineupId}`), payload);
            await showSuccessModal('Success', 'Lineup entry updated successfully.');
        } else {
            await push(ref(database, 'lineup'), payload);
            await showSuccessModal('Success', 'Lineup entry created successfully.');
        }
        resetLineupForm();
        teamFormVisible = false;
        renderCurrentTab();
    } catch (err) {
        console.error('Error saving lineup entry:', err);
        await showErrorModal('Error', 'Failed to save lineup entry.');
    }
}

async function handleRosterSave(e) {
    e.preventDefault();
    const teamName = document.getElementById('lineupTeamName')?.value.trim();
    if (!teamName) { await showErrorModal('Missing Team Name', 'Team name is required.'); return; }
    const rosterSize = Number(allData.rosterSize || 5);

    // collect existing team entries
    const existing = allData.lineup.filter(x => (x.teamName || '') === teamName);
    const existingByEntryId = new Map(existing.map(x => [x.id, x]));
    const filledRows = [];

    // save each row and collect non-empty entries
    try {
        for (let i = 1; i <= rosterSize; i++) {
            const ign = document.getElementById(`playerIgn_${i}`)?.value.trim() || '';
            const uid = document.getElementById(`playerUid_${i}`)?.value.trim() || '';
            const role = document.getElementById(`role_${i}`)?.value || '';
            const joining = document.getElementById(`joining_${i}`)?.value || '';
            const status = document.getElementById(`status_${i}`)?.value || 'Active';
            const entryId = document.getElementById(`entryId_${i}`)?.value || '';
            const profileBase = document.getElementById(`profileBase64_${i}`)?.value || '';
            const hasData = Boolean(ign || uid);

            if (!hasData) {
                if (entryId) {
                    await remove(ref(database, `lineup/${entryId}`));
                }
                continue;
            }

            filledRows.push({
                index: i,
                entryId,
                payload: {
                    teamName,
                    playerIgn: ign,
                    playerUid: uid,
                    role,
                    joiningDate: joining,
                    status,
                    profile: profileBase || (existingByEntryId.get(entryId)?.profile) || '',
                    logo: rosterDraft.logo || lineupDraft.logo || (existingByEntryId.get(entryId)?.logo) || '',
                    createdAt: new Date().toISOString()
                }
            });
        }

        const startSerial = Math.max(1, rosterSize - filledRows.length + 1);
        for (let idx = 0; idx < filledRows.length; idx++) {
            const row = filledRows[idx];
            const serialNumber = startSerial + idx;
            const payload = {
                ...row.payload,
                serialNumber
            };

            if (row.entryId) {
                await update(ref(database, `lineup/${row.entryId}`), payload);
            } else {
                await push(ref(database, 'lineup'), payload);
            }
        }

        // remove any leftover team entries not present in the current roster
        for (const x of existing) {
            const stillPresent = filledRows.some(row => row.entryId && row.entryId === x.id);
            if (!stillPresent) {
                await remove(ref(database, `lineup/${x.id}`));
            }
        }

        await showSuccessModal('Success', 'Roster saved successfully.');
        rosterDraft = { teamName: '', logo: '', players: [] };
        lineupDraft = { ...lineupDraft, teamName: '' };
        teamFormVisible = false;
        renderCurrentTab();
    } catch (err) {
        console.error('Error saving roster:', err);
        await showErrorModal('Error', 'Failed to save roster.');
    }
}

async function updateContactStatus(contactId, status) {
    try {
        await update(ref(database, `contacts/${contactId}`), { status });
        showSuccessModal('Updated', 'Status updated.');
    } catch (err) {
        console.error('Error updating contact status:', err);
        showErrorModal('Update Failed', 'Failed to update status.');
    }
}

async function deleteContactEntry(contactId) {
    const entry = allData.contacts.find(e => e.id === contactId);
    if (!entry) return;

    const confirmed = await window.showConfirmModal?.({
        title: 'Delete contact request',
        message: `Delete contact request from ${entry.fullName || 'this user'}?`,
        confirmText: 'Delete',
        cancelText: 'Cancel'
    });
    if (!confirmed) return;

    try {
        await remove(ref(database, `contacts/${contactId}`));
        showSuccessModal('Deleted', 'Contact request deleted.');
    } catch (err) {
        console.error('Error deleting contact request:', err);
        showErrorModal('Delete Failed', 'Failed to delete contact request.');
    }
}

async function deleteAllContactEntries() {
    if (!allData.contacts.length) return;

    const confirmed = await window.showConfirmModal?.({
        title: 'Delete all contact requests',
        message: `Delete all ${allData.contacts.length} contact request(s)?`,
        confirmText: 'Delete All',
        cancelText: 'Cancel'
    });
    if (!confirmed) return;

    try {
        const contactIds = allData.contacts.map(entry => entry.id).filter(Boolean);
        await Promise.all(contactIds.map(id => remove(ref(database, `contacts/${id}`))));
        showSuccessModal('Deleted', 'All contact requests deleted.');
    } catch (err) {
        console.error('Error deleting all contact requests:', err);
        showErrorModal('Delete Failed', 'Failed to delete all contact requests.');
    }
}

function sanitizeNotificationKey(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');
}

function getNotificationTargetPaths(recipient) {
    const paths = [];
    if (recipient?.userId) paths.push(recipient.userId);
    const emailValue = recipient?.userEmail || recipient?.emailAddress || '';
    const sanitized = sanitizeNotificationKey(emailValue);
    if (sanitized) paths.push(sanitized);
    return [...new Set(paths.filter(Boolean))];
}

async function sendNotificationToRecipient(recipient, payload) {
    const paths = getNotificationTargetPaths(recipient);
    if (!paths.length) return;
    await Promise.all(paths.map(path => push(ref(database, `notifications/${path}`), payload)));
}

function getContactReplyTarget(entry) {
    if (entry?.userId) return entry.userId;
    const emailValue = entry?.userEmail || entry?.emailAddress || '';
    const sanitized = sanitizeNotificationKey(emailValue);
    return sanitized || `contact_${entry?.id || 'unknown'}`;
}

function ensureContactReplyModal() {
    if (document.getElementById('contactReplyModal')) return;

    document.body.insertAdjacentHTML('beforeend', `
        <div id="contactReplyModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.72); z-index:9999; align-items:center; justify-content:center; padding:20px;">
            <div style="width:min(560px, 100%); background:#0a0a14; border:1px solid rgba(220,38,38,0.3); border-radius:18px; box-shadow:0 20px 60px rgba(0,0,0,0.45); overflow:hidden;">
                <div style="padding:18px 20px; border-bottom:1px solid #13131f; background:linear-gradient(135deg, rgba(220,38,38,0.15), rgba(10,10,20,0.95));">
                    <h3 style="margin:0; color:#fff; font-size:18px;">Reply to Contact</h3>
                    <p id="contactReplyModalTitle" style="margin:6px 0 0; color:#aaa; font-size:13px;">Write a reply for the sender.</p>
                </div>
                <div style="padding:20px; display:grid; gap:12px;">
                    <input id="contactReplyModalId" type="hidden">
                    <label style="color:#ddd; font-size:13px;">Message</label>
                    <textarea id="contactReplyModalMessage" rows="6" style="width:100%; padding:12px 14px; border:1px solid #1e1e2e; border-radius:10px; background:#0f0f0f; color:#fff; resize:vertical;"></textarea>
                    <div style="display:flex; justify-content:flex-end; gap:10px;">
                        <button type="button" onclick="closeContactReplyModal()" style="padding:10px 16px; border:1px solid #2a2a3a; background:transparent; color:#fff; border-radius:10px; cursor:pointer;">Cancel</button>
                        <button type="button" onclick="submitContactReply()" style="padding:10px 16px; border:none; background:#dc2626; color:#fff; border-radius:10px; cursor:pointer; font-weight:700;">Send Reply</button>
                    </div>
                </div>
            </div>
        </div>
    `);
}

function openContactReplyModal(contactId) {
    const entry = allData.contacts.find(e => e.id === contactId);
    if (!entry) return;
    ensureContactReplyModal();
    document.getElementById('contactReplyModalId').value = contactId;
    document.getElementById('contactReplyModalTitle').textContent = `Reply to ${entry.fullName || entry.emailAddress || 'this contact'}`;
    document.getElementById('contactReplyModalMessage').value = '';
    document.getElementById('contactReplyModal').style.display = 'flex';
    document.getElementById('contactReplyModalMessage').focus();
}

function closeContactReplyModal() {
    const modal = document.getElementById('contactReplyModal');
    if (modal) modal.style.display = 'none';
}

async function submitContactReply() {
    const contactId = document.getElementById('contactReplyModalId').value;
    const entry = allData.contacts.find(e => e.id === contactId);
    const replyMessage = document.getElementById('contactReplyModalMessage').value.trim();

    if (!entry || !replyMessage) {
        await showErrorModal('Missing Reply', 'Please enter a reply message.');
        return;
    }

    try {
        await sendNotificationToRecipient(
            { userId: entry.userId, userEmail: entry.userEmail || entry.emailAddress || '' },
            {
                message: `📩 Admin reply: ${replyMessage}`,
                status: 'Info',
                type: 'contact_reply',
                createdAt: new Date().toISOString()
            }
        );

        await update(ref(database, `contacts/${contactId}`), { status: 'Replied' });
        closeContactReplyModal();
        showSuccessModal('Reply Sent', '✅ Reply sent to the sender notification inbox.');
        renderCurrentTab();
    } catch (err) {
        console.error('Error sending contact reply:', err);
        showErrorModal('Send Failed', 'Failed to send reply.');
    }
}

function escapeHTML(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderProfileTab() {
    const totalUsers = [...new Set([
        ...allData.joins.map(e => e.userId),
        ...allData.tournaments.map(e => e.userId),
        ...allData.scrims.map(e => e.userId)
    ].filter(Boolean))].length;
    
    return `
        <h2 style="color: #fff; font-weight: 900; font-size: 20px; margin-bottom: 24px;">Admin Profile</h2>
        <div class="card" style="max-width: 480px;">
            <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 20px;">
                <div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(220, 38, 38, 0.15); border: 2px solid #dc2626; display: flex; align-items: center; justify-content: center; color: #dc2626; font-size: 28px;">👤</div>
                <div>
                    <p style="color: #fff; font-weight: 800; font-size: 18px;">Admin</p>
                    <p style="color: #dc2626; font-size: 12px; font-weight: 700;">Super Administrator</p>
                    <p style="color: #555; font-size: 12px;">${ADMIN_EMAIL}</p>
                </div>
            </div>
            <div style="background: #0a0a14; border-radius: 8px; padding: 14px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div>
                        <p style="color: #555; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">Role</p>
                        <p style="color: #ddd; font-size: 13px; font-weight: 600; margin-top: 2px;">Super Administrator</p>
                    </div>
                    <div>
                        <p style="color: #555; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">Access</p>
                        <p style="color: #ddd; font-size: 13px; font-weight: 600; margin-top: 2px;">Full Access</p>
                    </div>
                    <div>
                        <p style="color: #555; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">Join Applications</p>
                        <p style="color: #ddd; font-size: 13px; font-weight: 600; margin-top: 2px;">${allData.joins.length}</p>
                    </div>
                    <div>
                        <p style="color: #555; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">Tournament Entries</p>
                        <p style="color: #ddd; font-size: 13px; font-weight: 600; margin-top: 2px;">${allData.tournaments.length}</p>
                    </div>
                    <div>
                        <p style="color: #555; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">Scrim Bookings</p>
                        <p style="color: #ddd; font-size: 13px; font-weight: 600; margin-top: 2px;">${allData.scrims.length}</p>
                    </div>
                    <div>
                        <p style="color: #555; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">Total Users</p>
                        <p style="color: #ddd; font-size: 13px; font-weight: 600; margin-top: 2px;">${totalUsers}</p>
                    </div>
                </div>
            </div>
            <button class="btn btn-primary" style="width: 100%; padding: 12px 0; margin-top: 16px;" onclick="handleLogout()">🚪 Logout</button>
        </div>
    `;
}

function renderTotalUsersTab() {
    const users = allData.allUsers || [];
    
    if (!users.length) {
        return `
            <div style="padding: 30px; text-align: center; color: #555;">
                <p>No users found.</p>
            </div>
        `;
    }
    
    return `
        <div style="display: flex; flex-direction: column; gap: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h2 style="color: #fff; font-size: 24px; font-weight: 800; margin: 0;">👥 Total Users (${users.length})</h2>
            </div>
            
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; color: #ddd; font-size: 13px;">
                    <thead style="background: rgba(220, 38, 38, 0.08); border-top: 1px solid #1e1e2e; border-bottom: 1px solid #1e1e2e;">
                        <tr>
                            <th style="padding: 12px; text-align: left; color: #999; font-weight: 600;">Name</th>
                            <th style="padding: 12px; text-align: left; color: #999; font-weight: 600;">Email</th>
                            <th style="padding: 12px; text-align: left; color: #999; font-weight: 600;">Joined</th>
                            <th style="padding: 12px; text-align: left; color: #999; font-weight: 600;">User ID</th>
                            <th style="padding: 12px; text-align: right; color: #999; font-weight: 600;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map((user, idx) => `
                            <tr style="border-bottom: 1px solid #13131f; transition: background 0.2s;">
                                <td style="padding: 12px; color: #ddd; font-weight: 500;">${user.fullName || user.displayName || '—'}</td>
                                <td style="padding: 12px; color: #999; word-break: break-all;">${user.email || '—'}</td>
                                <td style="padding: 12px; color: #666; white-space: nowrap;">${user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN') : '—'}</td>
                                <td style="padding: 12px; color: #666; font-family: monospace; font-size: 11px; word-break: break-all;">${user.uid || '—'}</td>
                                <td style="padding: 12px; text-align: right;"><button onclick="deleteUser('${user.uid}')" style="padding: 6px 10px; border:1px solid #dc2626; background:transparent; color:#dc2626; border-radius:8px; cursor:pointer;">Delete</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderAnalyseTab() {
    const totalJoins = allData.joins ? allData.joins.length : 0;
    const totalTournaments = allData.tournaments ? allData.tournaments.length : 0;
    const totalScrims = allData.scrims ? allData.scrims.length : 0;
    const totalContacts = allData.contacts ? allData.contacts.length : 0;
    const totalUsers = allData.allUsers ? allData.allUsers.length : 0;
    
    const metrics = {
        'joins': { label: 'Join Requests', value: totalJoins, color: '#3b82f6' },
        'tournaments': { label: 'Tournament Registrations', value: totalTournaments, color: '#ec4899' },
        'scrims': { label: 'Scrims Registrations', value: totalScrims, color: '#8b5cf6' },
        'contacts': { label: 'Contact Messages', value: totalContacts, color: '#f59e0b' },
        'users': { label: 'Total Users', value: totalUsers, color: '#22c55e' }
    };

    const metricEntries = Object.entries(metrics);
    const maxValue = Math.max(...metricEntries.map(([, metric]) => metric.value), 1);
    
    return `
        <div style="display: flex; flex-direction: column; gap: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
                <h2 style="color: #fff; font-size: 24px; font-weight: 800; margin: 0;">📈 Website Analytics</h2>
                <div>
                    <label style="color: #999; font-size: 12px; margin-right: 8px;">Show Metric:</label>
                    <select id="analyseMetricFilter" style="background: #0f0f1a; border: 1px solid #2a2a3a; color: #fff; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer;">
                        <option value="all">All Metrics</option>
                        <option value="joins">Join Requests</option>
                        <option value="tournaments">Tournaments</option>
                        <option value="scrims">Scrims</option>
                        <option value="contacts">Contacts</option>
                        <option value="users">Users</option>
                    </select>
                </div>
            </div>
            
            <div id="metricsContainer" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                ${metricEntries.map(([key, metric]) => `
                    <div data-metric="${key}" style="background: rgba(${parseInt(metric.color.slice(1,3), 16)}, ${parseInt(metric.color.slice(3,5), 16)}, ${parseInt(metric.color.slice(5,7), 16)}, 0.08); border: 1px solid ${metric.color}40; border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 8px;">
                        <p style="color: #999; font-size: 12px; margin: 0; font-weight: 600; text-transform: uppercase;">${metric.label}</p>
                        <div style="display: flex; align-items: baseline; gap: 8px;">
                            <p style="color: ${metric.color}; font-size: 32px; font-weight: 900; margin: 0;">${metric.value}</p>
                            <span style="color: #666; font-size: 12px;">total</span>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div style="background: rgba(220, 38, 38, 0.08); border: 1px solid rgba(220, 38, 38, 0.2); border-radius: 12px; padding: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;">
                    <div>
                        <h3 style="color: #fff; font-size: 16px; font-weight: 700; margin: 0;">📊 Live Website Graph</h3>
                        <p style="color: #777; font-size: 12px; margin: 4px 0 0;">See the whole website at a glance or focus on just one category.</p>
                    </div>
                    <div id="analyticsChartSummary" style="color: #22c55e; font-size: 12px; font-weight: 700;">Showing all website metrics</div>
                </div>
                <div id="analyticsChart" style="display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; min-height: 220px; padding: 8px 4px 4px; border-top: 1px solid rgba(255,255,255,0.08); border-bottom: 1px solid rgba(255,255,255,0.08);">
                    ${metricEntries.map(([key, metric]) => `
                        <div data-chart-metric="${key}" style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; min-width: 0;">
                            <div style="width: 100%; max-width: 72px; height: 160px; display: flex; align-items: flex-end; justify-content: center;">
                                <div style="width: 100%; height: ${Math.max(24, Math.round((metric.value / maxValue) * 140))}px; background: linear-gradient(180deg, ${metric.color}, ${metric.color}99); border-radius: 10px 10px 4px 4px; box-shadow: 0 0 0 1px ${metric.color}33;"></div>
                            </div>
                            <div style="text-align: center;">
                                <p style="color: #fff; font-size: 13px; font-weight: 700; margin: 0;">${metric.value}</p>
                                <p style="color: #888; font-size: 10px; margin: 2px 0 0; text-transform: uppercase; letter-spacing: 0.5px;">${metric.label}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div style="background: rgba(220, 38, 38, 0.08); border: 1px solid rgba(220, 38, 38, 0.2); border-radius: 12px; padding: 20px; margin-top: 0;">
                <h3 style="color: #fff; font-size: 16px; font-weight: 700; margin-top: 0;">📊 Data Summary</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px;">
                    <div>
                        <p style="color: #666; font-size: 11px; margin: 0; text-transform: uppercase; margin-bottom: 4px;">Total Registrations</p>
                        <p style="color: #fff; font-size: 20px; font-weight: 700; margin: 0;">${totalJoins + totalTournaments + totalScrims}</p>
                    </div>
                    <div>
                        <p style="color: #666; font-size: 11px; margin: 0; text-transform: uppercase; margin-bottom: 4px;">Total Users</p>
                        <p style="color: #fff; font-size: 20px; font-weight: 700; margin: 0;">${totalUsers}</p>
                    </div>
                    <div>
                        <p style="color: #666; font-size: 11px; margin: 0; text-transform: uppercase; margin-bottom: 4px;">Total Messages</p>
                        <p style="color: #fff; font-size: 20px; font-weight: 700; margin: 0;">${totalContacts}</p>
                    </div>
                    <div>
                        <p style="color: #666; font-size: 11px; margin: 0; text-transform: uppercase; margin-bottom: 4px;">Engagement</p>
                        <p style="color: #22c55e; font-size: 20px; font-weight: 700; margin: 0;">${totalUsers > 0 ? Math.round((totalJoins / totalUsers) * 100) : 0}%</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderComingSoon(tabName) {
    const icons = {
        'hero': '🖥️',
        'explore': '🧭',
        'about': 'ℹ️',
        'team': '👥',
        'journey': '🚩',
        'gallery': '🖼️'
    };
    return `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 320px; gap: 16px;">
            <div style="width: 72px; height: 72px; border-radius: 50%; background: rgba(220, 38, 38, 0.1); border: 1px solid rgba(220, 38, 38, 0.3); display: flex; align-items: center; justify-content: center; color: #dc2626; font-size: 36px;">${icons[tabName] || '⏳'}</div>
            <h2 style="color: #fff; font-weight: 800; font-size: 20px;">Coming Soon</h2>
            <p style="color: #555; font-size: 14px;">This section is under development.</p>
            <span style="background: rgba(220, 38, 38, 0.1); color: #dc2626; padding: 6px 18px; border-radius: 20px; font-size: 12px; font-weight: 700; border: 1px solid rgba(220, 38, 38, 0.3);">COMING SOON</span>
        </div>
    `;
}

function renderRecentNotifications() {
    const notifications = [
        ...allData.joins.slice(0, 2).map(e => ({ msg: 'New join request received', sub: `${e.teamName || e.managerIgn || 'Team'} has requested to join`, time: e.createdAt })),
        ...allData.tournaments.slice(0, 2).map(e => ({ msg: 'Tournament registration received', sub: `${e.teamName || 'Team'} registered for tournament`, time: e.createdAt })),
        ...allData.scrims.slice(0, 1).map(e => ({ msg: 'New scrims registration received', sub: `${e.teamName || 'Team'} registered for scrims`, time: e.createdAt })),
        ...allData.contacts.slice(0, 1).map(e => ({ msg: 'New contact request received', sub: `${e.fullName || 'Guest'} sent a contact message`, time: e.createdAt })),
    ].slice(0, 5);
    
    if (!notifications.length) return '<p class="no-entries">No recent activity.</p>';
    
    return notifications.map((n, i) => `
        <div style="display: flex; gap: 10px; padding-bottom: 12px; margin-bottom: 12px; border-bottom: ${i < notifications.length - 1 ? '1px solid #13131f' : 'none'};">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: rgba(220, 38, 38, 0.15); border: 1px solid rgba(220, 38, 38, 0.3); display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #dc2626;">🔔</div>
            <div style="flex: 1; min-width: 0;">
                <p style="color: #ddd; font-size: 12px; font-weight: 600; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${n.msg}</p>
                <p style="color: #555; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${n.sub}</p>
            </div>
            <span style="color: #444; font-size: 10px; white-space: nowrap; flex-shrink: 0;">${n.time ? new Date(n.time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</span>
        </div>
    `).join('');
}

// ═════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════

function filterEntries(arr) {
    let result = filterStatus === 'All' ? arr : arr.filter(e => (e.status || 'Pending') === filterStatus);
    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        result = result.filter(e => JSON.stringify(e).toLowerCase().includes(q));
    }
    return result;
}

function getBadge(status) {
    const s = status || 'Pending';
    const className = s === 'Pending' ? 'badge-pending' : s === 'Accepted' ? 'badge-accepted' : 'badge-rejected';
    return `<span class="badge ${className}">${s}</span>`;
}

function getEntryType(entry) {
    if (allData.joins.find(e => e.id === entry.id)) return 'joins';
    if (allData.tournaments.find(e => e.id === entry.id)) return 'tournaments';
    if (allData.scrims.find(e => e.id === entry.id)) return 'scrims';
    return 'joins';
}

// ═════════════════════════════════════════════════════════════════════════
// MODAL FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════

function openEntryModal(entryId, type) {
    let entry;
    if (type === 'joins') entry = allData.joins.find(e => e.id === entryId);
    else if (type === 'tournaments') entry = allData.tournaments.find(e => e.id === entryId);
    else if (type === 'scrims') entry = allData.scrims.find(e => e.id === entryId);
    
    if (!entry) return;
    
    currentViewEntry = { ...entry, type };
    
    // Set modal header
    document.getElementById('modalTitle').textContent = entry.teamName || entry.managerIgn || entry.ign || 'Entry Details';
    
    const statusClass = (entry.status || 'Pending') === 'Pending' ? 'badge-pending' : (entry.status || 'Pending') === 'Accepted' ? 'badge-accepted' : 'badge-rejected';
    document.getElementById('modalStatus').className = `badge ${statusClass}`;
    document.getElementById('modalStatus').textContent = entry.status || 'Pending';
    
    document.getElementById('modalEmail').textContent = entry.userEmail || '';
    
    if (entry.teamLogo) {
        document.getElementById('modalImage').src = entry.teamLogo;
        document.getElementById('modalImage').style.display = 'block';
    } else {
        document.getElementById('modalImage').style.display = 'none';
    }
    
    // Set fields
    const skipKeys = ['id', 'teamLogo', 'userId', 'status'];
    const fieldsGrid = document.getElementById('modalFields');
    fieldsGrid.innerHTML = Object.entries(entry)
        .filter(([k]) => !skipKeys.includes(k) && entry[k])
        .map(([k, v]) => `
            <div class="field">
                <div class="field-label">${k}</div>
                <div class="field-value">${String(v)}</div>
            </div>
        `).join('');
    
    // Set actions
    const modalActions = document.getElementById('modalActions');
    modalActions.innerHTML = `
        <button class="btn" style="background: #16a34a; color: #fff;" onclick="acceptEntry()">✅ Accept</button>
        <button class="btn btn-primary" onclick="rejectEntry()">❌ Reject</button>
        <button class="btn" style="background: #374151; color: #fff;" onclick="deleteEntry()">🗑️ Delete</button>
    `;
    
    // Clear notification message
    document.getElementById('notifMessage').value = '';
    
    // Show modal
    document.getElementById('entryModal').classList.add('show');
}

function closeModal() {
    document.getElementById('entryModal').classList.remove('show');
    currentViewEntry = null;
}

document.getElementById('entryModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'entryModal') closeModal();
});

async function acceptEntry() {
    if (!currentViewEntry) return;
    
    const path = currentViewEntry.type === 'joins' ? 'applications' : currentViewEntry.type === 'tournaments' ? 'tournaments' : 'scrims';
    
    try {
        await update(ref(database, `${path}/${currentViewEntry.id}`), { status: 'Accepted' });
        
        if (currentViewEntry.userId || currentViewEntry.userEmail || currentViewEntry.emailAddress) {
            await sendNotificationToRecipient(
                {
                    userId: currentViewEntry.userId,
                    userEmail: currentViewEntry.userEmail || currentViewEntry.emailAddress || ''
                },
                {
                    message: `Your ${path === 'applications' ? 'join application' : path === 'tournaments' ? 'tournament registration' : 'scrim booking'} has been Accepted!`,
                    status: 'Accepted',
                    type: path === 'applications' ? 'join' : path === 'tournaments' ? 'tournament' : 'scrim',
                    createdAt: new Date().toISOString()
                }
            );
        }
        
        closeModal();
    } catch (err) {
        console.error('Error accepting entry:', err);
    }
}

async function rejectEntry() {
    if (!currentViewEntry) return;
    
    const path = currentViewEntry.type === 'joins' ? 'applications' : currentViewEntry.type === 'tournaments' ? 'tournaments' : 'scrims';
    
    try {
        await update(ref(database, `${path}/${currentViewEntry.id}`), { status: 'Rejected' });
        
        if (currentViewEntry.userId || currentViewEntry.userEmail || currentViewEntry.emailAddress) {
            await sendNotificationToRecipient(
                {
                    userId: currentViewEntry.userId,
                    userEmail: currentViewEntry.userEmail || currentViewEntry.emailAddress || ''
                },
                {
                    message: `Your ${path === 'applications' ? 'join application' : path === 'tournaments' ? 'tournament registration' : 'scrim booking'} has been Rejected.`,
                    status: 'Rejected',
                    type: path === 'applications' ? 'join' : path === 'tournaments' ? 'tournament' : 'scrim',
                    createdAt: new Date().toISOString()
                }
            );
        }
        
        closeModal();
    } catch (err) {
        console.error('Error rejecting entry:', err);
    }
}

async function deleteEntry() {
    if (!currentViewEntry) return;

    const confirmed = await window.showConfirmModal?.({
        title: 'Delete entry',
        message: 'Delete this entry?',
        confirmText: 'Delete',
        cancelText: 'Cancel'
    });
    if (!confirmed) return;
    
    const path = currentViewEntry.type === 'joins' ? 'applications' : currentViewEntry.type === 'tournaments' ? 'tournaments' : 'scrims';
    
    try {
        await remove(ref(database, `${path}/${currentViewEntry.id}`));
        closeModal();
    } catch (err) {
        console.error('Error deleting entry:', err);
    }
}

async function sendPersonalNotif() {
    if (!currentViewEntry) return;
    
    const message = document.getElementById('notifMessage').value.trim();
    if (!message) {
        await showErrorModal('Missing Message', 'Enter a message.');
        return;
    }
    
    if (!currentViewEntry.userId && !currentViewEntry.userEmail && !currentViewEntry.emailAddress) {
        await showErrorModal('Not Available', 'No user ID or email found for this entry.');
        return;
    }
    
    try {
        await sendNotificationToRecipient(
            {
                userId: currentViewEntry.userId,
                userEmail: currentViewEntry.userEmail || currentViewEntry.emailAddress || ''
            },
            {
                message: `📩 Admin: ${message}`,
                status: 'Info',
                type: 'admin_message',
                createdAt: new Date().toISOString()
            }
        );
        
        await showSuccessModal('Notification Sent', '✅ Notification sent!');
        document.getElementById('notifMessage').value = '';
    } catch (err) {
        await showErrorModal('Send Failed', 'Error sending notification: ' + err.message);
    }
}

async function sendBroadcast() {
    const message = document.getElementById('broadcastMsg')?.value.trim();
    if (!message) {
        await showErrorModal('Missing Message', 'Enter a message.');
        return;
    }
    
    const allUsers = allData.allUsers?.map(user => user.uid).filter(Boolean) || [];
    
    if (!allUsers.length) {
        await showErrorModal('No Users', 'No users are available for broadcast.');
        return;
    }
    
    if (!await showConfirmModal({
        title: 'Send Broadcast',
        message: `Send to ${allUsers.length} user(s)?`,
        confirmText: 'Send',
        cancelText: 'Cancel'
    })) return;
    
    try {
        await Promise.all(allUsers.map(uid => push(ref(database, `notifications/${uid}`), {
            message: `📢 ${message}`,
            status: 'Info',
            type: 'broadcast',
            createdAt: new Date().toISOString()
        })));
        
        await showSuccessModal('Broadcast Sent', `✅ Sent to ${allUsers.length} users!`);
        document.getElementById('broadcastMsg').value = '';
    } catch (err) {
        await showErrorModal('Send Failed', 'Error sending broadcast: ' + err.message);
    }
}

async function toggleSetting(setting) {
    try {
        if (setting === 'tournament') {
            await set(ref(database, 'settings/tournamentFormEnabled'), !allData.tournamentOn);
        } else if (setting === 'scrim') {
            await set(ref(database, 'settings/scrimFormEnabled'), !allData.scrimOn);
        } else if (setting === 'join') {
            await set(ref(database, 'settings/joinFormEnabled'), !allData.joinOn);
        }
    } catch (err) {
        console.error('Error toggling setting:', err);
    }
}

async function toggleBannerSetting(type) {
    try {
        if (type === 'tournament') {
            await set(ref(database, 'settings/tournamentBannerEnabled'), !allData.tournamentBannerEnabled);
        } else if (type === 'scrim') {
            await set(ref(database, 'settings/scrimBannerEnabled'), !allData.scrimBannerEnabled);
        } else if (type === 'join') {
            await set(ref(database, 'settings/joinBannerEnabled'), !allData.joinBannerEnabled);
        }
    } catch (err) {
        console.error('Error toggling banner setting:', err);
    }
}

async function saveTournamentBanner() {
    try {
        const fileInput = document.getElementById('tournamentBannerFile');
        const file = fileInput?.files?.[0];
        if (!file) {
            await showErrorModal('No File Selected', 'Please choose an image from your device first.');
            return;
        }
        const imageBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
        await set(ref(database, 'settings/tournamentBannerEnabled'), true);
        await set(ref(database, 'settings/tournamentBannerImage'), imageBase64);
        allData.tournamentBannerEnabled = true;
        allData.tournamentBannerImage = imageBase64;
        await showSuccessModal('Banner Saved', 'The tournament banner has been added.');
        renderCurrentTab();
    } catch (err) {
        console.error('Error saving tournament banner:', err);
        await showErrorModal('Save Failed', 'Could not save the tournament banner.');
    }
}

async function deleteTournamentBanner() {
    try {
        await set(ref(database, 'settings/tournamentBannerEnabled'), false);
        await set(ref(database, 'settings/tournamentBannerImage'), '');
        allData.tournamentBannerEnabled = false;
        allData.tournamentBannerImage = '';
        await showSuccessModal('Banner Removed', 'The tournament banner has been removed.');
        renderCurrentTab();
    } catch (err) {
        console.error('Error deleting tournament banner:', err);
        await showErrorModal('Delete Failed', 'Could not remove the tournament banner.');
    }
}

async function saveScrimBanner() {
    try {
        const fileInput = document.getElementById('scrimBannerFile');
        const file = fileInput?.files?.[0];
        if (!file) {
            await showErrorModal('No File Selected', 'Please choose an image from your device first.');
            return;
        }
        const imageBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
        await set(ref(database, 'settings/scrimBannerEnabled'), true);
        await set(ref(database, 'settings/scrimBannerImage'), imageBase64);
        allData.scrimBannerEnabled = true;
        allData.scrimBannerImage = imageBase64;
        await showSuccessModal('Banner Saved', 'The scrims banner has been added.');
        renderCurrentTab();
    } catch (err) {
        console.error('Error saving scrims banner:', err);
        await showErrorModal('Save Failed', 'Could not save the scrims banner.');
    }
}

async function deleteScrimBanner() {
    try {
        await set(ref(database, 'settings/scrimBannerEnabled'), false);
        await set(ref(database, 'settings/scrimBannerImage'), '');
        allData.scrimBannerEnabled = false;
        allData.scrimBannerImage = '';
        await showSuccessModal('Banner Removed', 'The scrims banner has been removed.');
        renderCurrentTab();
    } catch (err) {
        console.error('Error deleting scrims banner:', err);
        await showErrorModal('Delete Failed', 'Could not remove the scrims banner.');
    }
}

async function saveJoinBanner() {
    try {
        const fileInput = document.getElementById('joinBannerFile');
        const file = fileInput?.files?.[0];
        if (!file) {
            await showErrorModal('No File Selected', 'Please choose an image from your device first.');
            return;
        }
        const imageBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
        await set(ref(database, 'settings/joinBannerEnabled'), true);
        await set(ref(database, 'settings/joinBannerImage'), imageBase64);
        allData.joinBannerEnabled = true;
        allData.joinBannerImage = imageBase64;
        await showSuccessModal('Banner Saved', 'The join banner has been added.');
        renderCurrentTab();
    } catch (err) {
        console.error('Error saving join banner:', err);
        await showErrorModal('Save Failed', 'Could not save the join banner.');
    }
}

async function deleteJoinBanner() {
    try {
        await set(ref(database, 'settings/joinBannerEnabled'), false);
        await set(ref(database, 'settings/joinBannerImage'), '');
        allData.joinBannerEnabled = false;
        allData.joinBannerImage = '';
        await showSuccessModal('Banner Removed', 'The join banner has been removed.');
        renderCurrentTab();
    } catch (err) {
        console.error('Error deleting join banner:', err);
        await showErrorModal('Delete Failed', 'Could not remove the join banner.');
    }
}

async function saveRoomSetting() {
    try {
        const key = document.getElementById('roomPresetSelect')?.value || 'orgTrial';
        const roomId = document.getElementById('roomIdInput')?.value || '';
        const groups = (document.getElementById('roomGroupsInput')?.value || '').toString().trim();
        // store groups as a simple value (e.g., total groups number or comma list depending on admin input)
        const datetime = document.getElementById('roomDatetimeInput')?.value || '';
        const rules = document.getElementById('roomRulesInput')?.value || '';

        const payload = { roomId, groups, datetime, rules };
        await set(ref(database, `settings/roomSettings/${key}`), payload);
        allData.roomSettings = allData.roomSettings || {};
        allData.roomSettings[key] = payload;
        await showSuccessModal('Saved', 'Room setting saved.');
        renderCurrentTab();
    } catch (err) {
        console.error('Error saving room setting:', err);
        await showErrorModal('Save Failed', 'Could not save room setting.');
    }
}

async function deleteRoomSetting() {
    try {
        const key = document.getElementById('roomPresetSelect')?.value || 'orgTrial';
        await set(ref(database, `settings/roomSettings/${key}`), null);
        if (allData.roomSettings) delete allData.roomSettings[key];
        await showSuccessModal('Deleted', 'Room setting removed.');
        renderCurrentTab();
    } catch (err) {
        console.error('Error deleting room setting:', err);
        await showErrorModal('Delete Failed', 'Could not delete room setting.');
    }
}

async function saveRoomMappings() {
    try {
        const joinMap = document.getElementById('joinRoomMappingSelect')?.value || 'orgTrial';
        const tourMap = document.getElementById('tournamentRoomMappingSelect')?.value || 'tournament';
        const scrimMap = document.getElementById('scrimRoomMappingSelect')?.value || 'scrim';
        await set(ref(database, 'settings/roomMapping/join'), joinMap);
        await set(ref(database, 'settings/roomMapping/tournament'), tourMap);
        await set(ref(database, 'settings/roomMapping/scrims'), scrimMap);
        allData.roomMapping = { join: joinMap, tournament: tourMap, scrims: scrimMap };
        await showSuccessModal('Saved', 'Room mappings updated.');
        renderCurrentTab();
    } catch (err) {
        console.error('Error saving room mappings:', err);
        await showErrorModal('Save Failed', 'Could not save room mappings.');
    }
}

async function saveUpcomingTournamentBanner() {
    try {
        const fileInput = document.getElementById('upcomingTournamentBannerFile');
        const file = fileInput?.files?.[0];

        if (!file) {
            await showErrorModal('No File Selected', 'Please choose an image from your device first.');
            return;
        }

        const imageBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });

        await set(ref(database, 'settings/upcomingTournamentBannerEnabled'), true);
        await set(ref(database, 'settings/upcomingTournamentBannerImage'), imageBase64);
        allData.upcomingTournamentBannerImage = imageBase64;

        await showSuccessModal('Banner Saved', 'The image has been added to the upcoming tournament section on the website.');
        renderCurrentTab();
    } catch (err) {
        console.error('Error saving upcoming tournament banner:', err);
        await showErrorModal('Save Failed', 'Could not save the banner image.');
    }
}

async function deleteUpcomingTournamentBanner() {
    try {
        await set(ref(database, 'settings/upcomingTournamentBannerEnabled'), false);
        await set(ref(database, 'settings/upcomingTournamentBannerImage'), '');
        allData.upcomingTournamentBannerImage = '';
        await showSuccessModal('Banner Removed', 'The upcoming tournament banner has been removed.');
        renderCurrentTab();
    } catch (err) {
        console.error('Error deleting upcoming tournament banner:', err);
        await showErrorModal('Delete Failed', 'Could not remove the banner.');
    }
}

async function deleteUser(userId) {
    if (!userId) return;
    const confirmed = confirm('Delete this user account? This will remove the user from the database and cannot be undone.');
    if (!confirmed) return;
    try {
        await set(ref(database, `users/${userId}`), null);
        allData.allUsers = allData.allUsers.filter(user => user.uid !== userId);
        await showSuccessModal('Deleted', 'The user has been removed.');
        renderCurrentTab();
    } catch (err) {
        console.error('Error deleting user:', err);
        await showErrorModal('Delete Failed', 'Could not delete the user.');
    }
}

// ═════════════════════════════════════════════════════════════════════════
// UI CONTROLS
// ═════════════════════════════════════════════════════════════════════════

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
}

async function handleLogout() {
    try {
        await signOut(auth);
        window.location.href = 'admin-login.html';
    } catch (err) {
        console.error('Error logging out:', err);
    }
}
