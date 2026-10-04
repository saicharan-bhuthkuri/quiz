import {
  apiGetAdminUsers,
  apiGetAdminStats,
  apiDeleteUser,
  apiSeedUsers,
  apiGetAdminList,
  apiAddAdmin,
  apiRemoveAdmin,
  apiGetEvents,
  apiCreateEvent,
  apiDeleteEvent,
  apiGetEventQuestions,
  apiAddEventQuestion,
  apiUpdateEventQuestion,
  apiDeleteEventQuestion,
  apiGetEventParticipants,
  apiRegisterForEvent,
  apiUnregisterEventParticipant,
  apiGetEventLeaderboard,
  QuizEvent,
  EventQuestion,
  EventParticipant,
  LeaderboardEntry,
  AdminUserRecord,
  AdminStats,
  AdminRecord
} from '../api/client.ts';
import { soundEngine } from '../components/AudioEffects.ts';
import { showToast } from '../components/Toast.ts';
import { icon } from '../components/Icons.ts';
import { wsClient } from '../services/wsClient.ts';
import { getAllUsersFromTurso } from '../db/turso.ts';

export function renderAdminDashboardView(
  container: HTMLElement,
  onNavigate: (view: string) => void
): void {
  // Check admin session
  const adminToken = sessionStorage.getItem('engiverse_admin_token');
  if (!adminToken) {
    onNavigate('admin-login');
    return;
  }

  // Ensure WebSocket is connected and authenticated as ADMIN
  wsClient.connect();
  wsClient.refreshUser();

  const currentAdminEmail = sessionStorage.getItem('engiverse_admin_email') || 'saicharanbhuthkuri468@gmail.com';
  const rawAdminName = sessionStorage.getItem('engiverse_admin_name') || 'Sai Charan Bhuthkuri';
  const currentAdminName = rawAdminName.replace(/\s*\(Superadmin\)/i, '').trim();

  container.innerHTML = `
    <div class="admin-shell-layout" id="admin-shell">
      <!-- Mobile Sidebar Overlay Backdrop -->
      <div id="sidebar-backdrop" class="admin-sidebar-overlay" style="display: none;"></div>

      <!-- Slide-Out Left Sidebar ("Slide Bar") -->
      <aside class="admin-sidebar" id="admin-sidebar">
        <!-- Sidebar Brand Header -->
        <div class="sidebar-brand-box">
          <a href="#" class="sidebar-brand-link" id="sidebar-brand-home" title="Engiverse Homepage">
            <img src="/logo.png" alt="Engiverse Logo" class="brand-logo-img" />
            <div class="sidebar-brand-text">
              <span class="brand-name">Engiverse<span class="brand-dot">.</span></span>
              <span class="sidebar-portal-tag">ADMIN PORTAL</span>
            </div>
          </a>
          <button id="btn-close-sidebar" class="btn-close-sidebar" aria-label="Close slide bar" title="Close Slide Bar">${icon('X', 18)}</button>
        </div>

        <!-- Navigation Tabs Menu -->
        <nav class="sidebar-nav-menu">
          <span class="sidebar-group-label">WORKSPACE</span>
          
          <button class="sidebar-nav-btn active" id="tab-btn-users" data-tab="users">
            <span class="nav-btn-icon">${icon('Users', 18)}</span>
            <span class="nav-btn-text">Users Directory</span>
            <span class="nav-count-badge" id="badge-users-count">0</span>
          </button>

          <button class="sidebar-nav-btn" id="tab-btn-admins" data-tab="admins">
            <span class="nav-btn-icon">${icon('Shield', 18)}</span>
            <span class="nav-btn-text">List of Admins</span>
            <span class="nav-count-badge" id="badge-admins-count">0</span>
          </button>

          <span class="sidebar-group-label" style="margin-top: 1.25rem;">EVENT MANAGEMENT</span>

          <button class="sidebar-nav-btn" id="tab-btn-event-register" data-tab="event-register">
            <span class="nav-btn-icon">${icon('UserPlus', 18)}</span>
            <span class="nav-btn-text">Register Event</span>
          </button>

          <button class="sidebar-nav-btn" id="tab-btn-event-participants" data-tab="event-participants">
            <span class="nav-btn-icon">${icon('Users', 18)}</span>
            <span class="nav-btn-text">Event Participants</span>
          </button>

          <button class="sidebar-nav-btn" id="tab-btn-event-questions" data-tab="event-questions">
            <span class="nav-btn-icon">${icon('HelpCircle', 18)}</span>
            <span class="nav-btn-text">Question Management</span>
          </button>

          <button class="sidebar-nav-btn" id="tab-btn-event-exam" data-tab="event-exam">
            <span class="nav-btn-icon">${icon('PlayCircle', 18)}</span>
            <span class="nav-btn-text">Exam Management</span>
            <span class="pulse-dot" id="sidebar-exam-live-dot" style="display: none; margin-left: auto;"></span>
          </button>

          <button class="sidebar-nav-btn" id="tab-btn-event-scoreboard" data-tab="event-scoreboard">
            <span class="nav-btn-icon">${icon('Award', 18)}</span>
            <span class="nav-btn-text">Event Scoreboard</span>
          </button>
        </nav>

        <!-- Sidebar Footer: Current Superadmin Profile -->
        <div class="sidebar-footer-box">
          <div class="current-admin-card">
            <div class="admin-avatar-shield">${icon('Shield', 16)}</div>
            <div class="current-admin-meta">
              <span class="current-admin-name">${escapeHtml(currentAdminName)}</span>
              <span class="current-admin-role">SUPERADMIN</span>
              <span class="current-admin-email" title="${escapeHtml(currentAdminEmail)}">${escapeHtml(currentAdminEmail)}</span>
            </div>
          </div>

          <button id="btn-sidebar-logout" class="btn-sidebar-exit">
            <span>${icon('LogOut', 15)} Exit Admin Console</span>
          </button>
        </div>
      </aside>

      <!-- Main Admin Content Area -->
      <div class="admin-main-viewport">
        <!-- Top App Bar -->
        <header class="admin-topbar">
          <div class="topbar-left">
            <button id="btn-open-sidebar" class="btn-sidebar-hamburger" aria-label="Toggle Navigation Slide Bar" title="Open / Close Navigation Slide Bar">
              <span class="hamburger-icon">${icon('Menu', 18)}</span>
              <span class="hamburger-label">Slide Bar</span>
            </button>
            <div class="topbar-breadcrumb">
              <span class="breadcrumb-root">Admin Console</span>
              <span class="breadcrumb-slash">/</span>
              <span class="breadcrumb-current" id="topbar-page-label">Users Directory</span>
            </div>
          </div>

          <div class="topbar-right">
            <!-- Turso Cloud DB Status Pill -->
            <div class="topbar-db-badge" title="Turso Cloud DB: Live &amp; Operational in aws-ap-south-1">
              <span class="live-pulse-dot"></span>
              <div class="db-badge-info">
                <span class="db-badge-name">Turso Cloud DB</span>
                <span class="db-badge-status">Live &amp; Operational</span>
              </div>
            </div>

            <div class="topbar-sync-tag" id="topbar-sync-time" title="Last synchronized time">
              Synced: Just now
            </div>
          </div>
        </header>

        <!-- View Body Content -->
        <main class="admin-page-scroll">
          <!-- ================= TAB 1: USERS DIRECTORY ================= -->
          <section id="view-users-tab" class="admin-tab-section active">
            <!-- Header Row -->
            <div class="admin-section-header">
              <div>
                <div class="title-with-pill">
                  <h1 class="admin-view-heading">Engineer User Directory</h1>
                  <span class="count-pill-modern" id="users-view-count">0 Users</span>
                </div>
                <p class="admin-view-desc">Real-time overview and account inspection for all registered engineers in your Turso cloud database.</p>
              </div>
            </div>

            <!-- Metrics Cards Grid -->
            <div class="admin-metrics-grid">
              <div class="admin-stat-card">
                <div class="stat-icon-wrap" style="background: #eef2ff; color: #4f46e5;">${icon('Users', 22)}</div>
                <div class="stat-meta">
                  <span class="stat-val" id="metric-total-users">—</span>
                  <span class="stat-title">Registered Engineers</span>
                  <span class="stat-sub">Accounts in Turso DB</span>
                </div>
              </div>

              <div class="admin-stat-card">
                <div class="stat-icon-wrap" style="background: #ecfeff; color: #0891b2;">${icon('Zap', 22)}</div>
                <div class="stat-meta">
                  <span class="stat-val" id="metric-total-xp">—</span>
                  <span class="stat-title">Total XP Earned</span>
                  <span class="stat-sub">Platform gamification</span>
                </div>
              </div>

              <div class="admin-stat-card">
                <div class="stat-icon-wrap" style="background: #ecfdf5; color: #059669;">${icon('Target', 22)}</div>
                <div class="stat-meta">
                  <span class="stat-val" id="metric-total-attempts">—</span>
                  <span class="stat-title">Quiz Attempts</span>
                  <span class="stat-sub">Tests completed</span>
                </div>
              </div>

              <div class="admin-stat-card">
                <div class="stat-icon-wrap" style="background: #fffbeb; color: #d97706;">${icon('GraduationCap', 22)}</div>
                <div class="stat-meta">
                  <span class="stat-val" id="metric-top-branch">—</span>
                  <span class="stat-title">Top Active Branch</span>
                  <span class="stat-sub">Highest enrollment</span>
                </div>
              </div>
            </div>

            <!-- Table Container -->
            <div class="admin-table-container">
              <!-- Toolbar -->
              <div class="admin-toolbar">
                <div class="admin-search-wrapper">
                  <span class="search-icon">${icon('Search', 15)}</span>
                  <input type="text" id="admin-search-input" class="admin-search-field" placeholder="Search by name, email, or mobile..." />
                </div>

                <div class="admin-filters-group">
                  <select id="admin-filter-branch" class="admin-select-filter">
                    <option value="ALL">All Branches</option>
                    <option value="Computer Science">Computer Science (CSE)</option>
                    <option value="Information Technology">Information Technology (IT)</option>
                    <option value="AI & Data Science">AI & Data Science</option>
                    <option value="Electronics">Electronics (ECE)</option>
                    <option value="Electrical">Electrical (EEE)</option>
                    <option value="Mechanical">Mechanical (ME)</option>
                    <option value="Civil">Civil (CE)</option>
                    <option value="Aerospace">Aerospace</option>
                  </select>

                  <select id="admin-filter-year" class="admin-select-filter">
                    <option value="ALL">All Years</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                    <option value="Graduate">Graduate</option>
                    <option value="Working Professional">Working</option>
                  </select>

                  <select id="admin-sort-by" class="admin-select-filter">
                    <option value="xp-desc">Sort: XP (High to Low)</option>
                    <option value="streak-desc">Sort: Streak (High to Low)</option>
                    <option value="newest">Sort: Newest First</option>
                    <option value="name-asc">Sort: Name (A-Z)</option>
                  </select>

                  <button id="btn-table-export" class="admin-toolbar-btn btn-export-csv" title="Export users list as CSV file">
                    <span class="toolbar-btn-icon">${icon('Download', 14)}</span>
                    <span>Export Users CSV</span>
                  </button>

                  <button id="btn-table-refresh" class="admin-toolbar-btn btn-refresh-records" title="Refresh all records from Turso database">
                    <span class="toolbar-btn-icon">${icon('RotateCw', 14)}</span>
                    <span>Refresh Records</span>
                  </button>
                </div>
              </div>

              <!-- Table -->
              <div class="table-responsive">
                <table class="admin-users-table">
                  <thead>
                    <tr>
                      <th class="col-engineer">Engineer</th>
                      <th class="col-branch">Branch</th>
                      <th class="col-year">Year</th>
                      <th class="col-streak">Streak</th>
                      <th class="col-xp">XP Points</th>
                      <th class="col-actions" style="text-align: right;">Actions</th>
                    </tr>
                  </thead>
                  <tbody id="admin-users-tbody">
                    <tr>
                      <td colspan="6" style="text-align: center; padding: 4rem 2rem;">
                        <div class="admin-loading-spinner"></div>
                        <span style="color: var(--text-muted); font-size: 0.95rem; margin-top: 0.5rem; display: block;">Loading engineers from Turso Cloud DB...</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Footer -->
              <div class="admin-table-footer">
                <span id="admin-user-count-label" class="admin-table-count-text">Loading users...</span>
                <span class="admin-quick-legend">${icon('Lightbulb', 14)} Click <strong>View</strong> to inspect full profile or <strong>Delete</strong> to remove.</span>
              </div>
            </div>
          </section>

          <!-- ================= TAB 2: LIST OF ADMINS ================= -->
          <section id="view-admins-tab" class="admin-tab-section" style="display: none;">
            <div class="admin-section-header">
              <div class="header-split-row">
                <div>
                  <div class="title-with-pill">
                    <h1 class="admin-view-heading">List of Administrators</h1>
                    <span class="count-pill-modern" id="admins-view-count">0 Admins</span>
                  </div>
                  <p class="admin-view-desc">Privileged administrator accounts authorized to manage the Engiverse platform, Turso databases, and security keys.</p>
                </div>
                <button id="btn-open-add-admin-modal" class="btn btn-primary btn-pill">
                  <span>${icon('Plus', 15)} Add New Admin</span>
                </button>
              </div>
            </div>

            <!-- Admins Table Container -->
            <div class="admin-table-container">
              <!-- Admin Search & Filter Toolbar -->
              <div class="admin-toolbar">
                <div class="admin-search-wrapper">
                  <span class="search-icon">${icon('Search', 15)}</span>
                  <input
                    type="text"
                    id="admins-search-input"
                    class="admin-search-field"
                    placeholder="Search administrators by name, email, or ID..."
                  />
                </div>

                <div class="admin-filters-group">
                  <select id="admins-filter-role" class="admin-select-filter">
                    <option value="ALL">All Roles</option>
                    <option value="SUPERADMIN">Superadmin</option>
                    <option value="ADMIN">Admin</option>
                  </select>

                  <select id="admins-sort-by" class="admin-select-filter">
                    <option value="role">Sort: Superadmin First</option>
                    <option value="newest">Sort: Newest First</option>
                    <option value="name-asc">Sort: Name (A-Z)</option>
                  </select>

                  <button id="btn-admins-export" class="admin-toolbar-btn btn-export-csv" title="Export administrators list as CSV file">
                    <span class="toolbar-btn-icon">${icon('Download', 14)}</span>
                    <span>Export Admins CSV</span>
                  </button>

                  <button id="btn-admins-refresh" class="admin-toolbar-btn btn-refresh-records" title="Refresh all records from Turso database">
                    <span class="toolbar-btn-icon">${icon('RotateCw', 14)}</span>
                    <span>Refresh Records</span>
                  </button>
                </div>
              </div>

              <div class="table-responsive">
                <table class="admin-users-table">
                  <thead>
                    <tr>
                      <th class="col-adm-name">Administrator</th>
                      <th class="col-adm-email">Admin Email</th>
                      <th class="col-adm-role">Role & Permissions</th>
                      <th class="col-adm-sec">Security Access</th>
                      <th class="col-adm-date">Created Date</th>
                      <th class="col-adm-actions" style="text-align: right;">Action</th>
                    </tr>
                  </thead>
                  <tbody id="admin-list-tbody">
                    <tr>
                      <td colspan="6" style="text-align: center; padding: 4rem 2rem;">
                        <div class="admin-loading-spinner"></div>
                        <span style="color: var(--text-muted); font-size: 0.95rem; margin-top: 0.5rem; display: block;">Loading administrators...</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="admin-table-footer">
                <span id="admin-count-label" class="admin-table-count-text">Authorized admin staff</span>
                <span class="admin-quick-legend">${icon('Lock', 14)} Primary Superadministrator (<code>${escapeHtml(currentAdminEmail)}</code>) is protected.</span>
              </div>
            </div>
          </section>

          <!-- ================= TAB 3: LIVE EVENTS & HOST CONSOLE ================= -->
          <section id="view-events-tab" class="admin-tab-section" style="display: none;">
            <!-- Subview A: Events List & Overview -->
            <div id="events-list-subview">
              <!-- Events Operational Topbar -->
              <div class="admin-section-header">
                <div class="admin-section-meta">
                  <div class="meta-icon-badge" style="background: #ede9fe; color: #6d28d9; border-color: #ddd6fe;">
                    ${icon('Trophy', 20)}
                  </div>
                  <div>
                    <h2 class="admin-section-title">Live Competitive Events</h2>
                    <p class="admin-section-subtitle">Real-time synchronized multiplayer quizzes with server-driven question flow and live scoreboards</p>
                  </div>
                </div>

                <div class="admin-top-actions">
                  <button id="btn-events-refresh" class="btn btn-secondary btn-pill" title="Refresh Events">
                    <span>${icon('RefreshCw', 14)} Refresh</span>
                  </button>
                </div>
              </div>

              <!-- Events Table Container -->
              <div class="admin-table-container">
                <!-- Events Search & Filter Toolbar -->
                <div class="admin-toolbar">
                  <div class="admin-search-wrapper">
                    <span class="search-icon">${icon('Search', 15)}</span>
                    <input
                      type="text"
                      id="events-search-input"
                      class="admin-search-field"
                      placeholder="Search events by title or engineering domain..."
                    />
                  </div>

                  <div class="admin-filters-group">
                    <select id="events-filter-status" class="admin-select-filter">
                      <option value="ALL">All Statuses</option>
                      <option value="UPCOMING">Upcoming</option>
                      <option value="LIVE_NOW">Live Now</option>
                      <option value="COMPLETED">Completed</option>
                    </select>

                    <button id="btn-events-refresh-top" class="admin-toolbar-btn btn-refresh-records" title="Refresh all events from Turso database">
                      <span class="toolbar-btn-icon">${icon('RotateCw', 14)}</span>
                      <span>Refresh Records</span>
                    </button>
                  </div>
                </div>

                <div class="table-responsive">
                  <table class="admin-users-table admin-events-table">
                    <thead>
                      <tr>
                        <th style="width: 32%;">Event Title &amp; Domain</th>
                        <th style="width: 14%;">Status</th>
                        <th style="width: 12%;">Registered</th>
                        <th style="width: 12%;">Questions</th>
                        <th style="width: 10%;">Timer</th>
                        <th style="width: 20%; text-align: right;">Host &amp; Actions</th>
                      </tr>
                    </thead>
                    <tbody id="events-list-tbody">
                      <tr>
                        <td colspan="6" style="text-align: center; padding: 4rem 2rem;">
                          <div class="admin-loading-spinner"></div>
                          <span style="color: var(--text-muted); font-size: 0.95rem; margin-top: 0.5rem; display: block;">Loading live events...</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div class="admin-table-footer">
                  <span id="events-table-count-label" class="admin-table-count-text">Synchronized live competitive events</span>
                  <span class="admin-quick-legend">${icon('Radio', 14)} Real-time question flow and leaderboard synchronization active.</span>
                </div>
              </div>
            </div>

            <!-- Subview B: Live Host Controller & Live Scoreboard -->
            <div id="events-host-subview" style="display: none;">
              <!-- Dynamic Host Console will be mounted here -->
            </div>
          </section>

          <!-- ================= TAB: ADD & REMOVE EVENTS ================= -->
          <section id="view-add-event-tab" class="admin-tab-section" style="display: none;">
            <div class="admin-section-header">
              <div class="header-split-row">
                <div>
                  <div class="title-with-pill">
                    <h1 class="admin-view-heading">Add &amp; Remove Events</h1>
                    <span class="count-pill-modern">Event Operations</span>
                  </div>
                  <p class="admin-view-desc">Configure, launch new competitive events, or manage and permanently delete existing ones.</p>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                  <button id="btn-goto-events-list-from-add" class="btn btn-secondary btn-pill">
                    <span>${icon('List', 14)} View List of Events</span>
                  </button>
                </div>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: minmax(320px, 580px) 1fr; gap: 1.5rem; align-items: start;">
              <!-- Add Event Card -->
              <div class="admin-card" style="padding: 2rem; border-radius: var(--radius-xl); background: #ffffff; border: 1.5px solid var(--border-card);">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.25rem;">
                  <span class="modal-badge-chip">${icon('Trophy', 14)} NEW EVENT CONFIGURATION</span>
                </div>
                <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.4rem;">Create Live Competition</h3>
                <p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 1.5rem;">
                  Once created, the event will instantly appear in all event selectors, the List of Events, and the participant event register.
                </p>

                <form id="form-add-event-page">
                  <div class="form-group" style="margin-bottom: 1.25rem;">
                    <label class="form-label" for="page-event-title">Event Title</label>
                    <div class="input-wrapper">
                      <span class="input-icon">${icon('Trophy', 16)}</span>
                      <input type="text" id="page-event-title" class="auth-input" placeholder="e.g. National Robotics &amp; AI Championship" required />
                    </div>
                  </div>

                  <div class="form-group" style="margin-bottom: 1.25rem;">
                    <label class="form-label" for="page-event-desc">Short Description / Subtitle</label>
                    <div class="input-wrapper">
                      <span class="input-icon">${icon('FileText', 16)}</span>
                      <input type="text" id="page-event-desc" class="auth-input" placeholder="e.g. 5-round synchronized competitive challenge" />
                    </div>
                  </div>

                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                    <div class="form-group">
                      <label class="form-label" for="page-event-domain">Engineering Domain</label>
                      <div class="input-wrapper">
                        <span class="input-icon">${icon('Cpu', 16)}</span>
                        <select id="page-event-domain" class="auth-input">
                          <option value="Computer Systems">Computer Systems</option>
                          <option value="Electronics &amp; VLSI">Electronics &amp; VLSI</option>
                          <option value="Mechanical &amp; Aerospace">Mechanical &amp; Aerospace</option>
                          <option value="Civil &amp; Structural">Civil &amp; Structural</option>
                          <option value="Chemical &amp; Bio">Chemical &amp; Bio</option>
                          <option value="Electrical Power">Electrical Power</option>
                        </select>
                      </div>
                    </div>

                    <div class="form-group">
                      <label class="form-label" for="page-event-timer">Timer Per Question (sec)</label>
                      <div class="input-wrapper">
                        <span class="input-icon">${icon('Clock', 16)}</span>
                        <input type="number" id="page-event-timer" class="auth-input" value="30" min="5" max="180" required />
                      </div>
                    </div>
                  </div>

                  <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.75rem;">
                    <button type="reset" class="btn btn-secondary btn-pill">
                      <span>Reset</span>
                    </button>
                    <button type="submit" id="btn-submit-page-add-event" class="btn btn-primary btn-pill" style="background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);">
                      <span>${icon('PlusCircle', 15)} Create &amp; Broadcast Event</span>
                    </button>
                  </div>
                </form>
              </div>

              <!-- Quick Info / Recent Events Preview -->
              <div style="display: flex; flex-direction: column; gap: 1.25rem;">
                <div class="admin-card" style="padding: 1.5rem; border-radius: var(--radius-xl); background: #f8fafc; border: 1.5px solid var(--border-card);">
                  <h4 style="font-size: 1rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.6rem; display: flex; align-items: center; gap: 0.4rem;">
                    ${icon('Zap', 16)} Next Steps After Creating
                  </h4>
                  <ul style="margin: 0; padding-left: 1.25rem; font-size: 0.86rem; color: var(--text-secondary); line-height: 1.6;">
                    <li>Add questions in <strong>Question Management</strong>.</li>
                    <li>Enroll participants in <strong>Register Event</strong>.</li>
                    <li>Open <strong>Exam Management</strong> to start the live quiz room and broadcast questions.</li>
                    <li>Track participant rankings in real-time in <strong>Event Scoreboard</strong>.</li>
                  </ul>
                </div>

                <div class="admin-card" style="padding: 1.5rem; border-radius: var(--radius-xl); background: #ffffff; border: 1.5px solid var(--border-card);">
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                    <h4 style="font-size: 1rem; font-weight: 700; color: var(--text-main); margin: 0; display: flex; align-items: center; gap: 0.4rem;">
                      ${icon('Calendar', 16)} Existing Events
                    </h4>
                    <span class="count-pill-modern" id="add-page-events-count">0 Events</span>
                  </div>
                  <div id="add-page-recent-events-list" style="display: flex; flex-direction: column; gap: 0.65rem; max-height: 280px; overflow-y: auto;">
                    <!-- Dynamically populated with existing events -->
                  </div>
                </div>
              </div>
            </div>

            <!-- Section Divider: Remove Unwanted Events -->
            <div style="margin-top: 2.25rem; margin-bottom: 1rem; border-top: 1px solid var(--border-card); padding-top: 1.75rem;">
              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 0.4rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <span class="modal-badge-chip" style="background: #fee2e2; color: #dc2626; border-color: #fca5a5;">${icon('Trash2', 13)} DELETION MANAGER</span>
                  <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--text-main); margin: 0;">Remove Events</h3>
                </div>
              </div>
              <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0;">
                Permanently delete test, cancelled, or outdated competitive events from your database.
              </p>
            </div>

            <!-- Warning Banner -->
            <div style="background: #fff1f2; border: 1.5px solid #fecdd3; border-radius: var(--radius-lg); padding: 0.85rem 1.15rem; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.75rem;">
              <span style="color: #e11d48;">${icon('AlertTriangle', 18)}</span>
              <div style="font-size: 0.84rem; color: #9f1239;">
                <strong>Permanent Action:</strong> Deleting an event will permanently erase all associated question sets, registered participant records, and live scoreboard scores.
              </div>
            </div>

            <!-- Events Deletion Table Container -->
            <div class="admin-table-container">
              <div class="admin-toolbar">
                <div class="admin-search-wrapper">
                  <span class="search-icon">${icon('Search', 15)}</span>
                  <input
                    type="text"
                    id="remove-event-search-input"
                    class="admin-search-field"
                    placeholder="Search event to remove by title or domain..."
                  />
                </div>
                <div class="admin-filters-group">
                  <button id="btn-refresh-remove-list" class="admin-toolbar-btn btn-refresh-records" title="Refresh events list">
                    <span class="toolbar-btn-icon">${icon('RotateCw', 14)}</span>
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              <div class="table-responsive">
                <table class="admin-users-table">
                  <thead>
                    <tr>
                      <th style="width: 32%;">Event Title &amp; Domain</th>
                      <th style="width: 14%;">Status</th>
                      <th style="width: 14%;">Registered</th>
                      <th style="width: 14%;">Questions</th>
                      <th style="width: 12%;">Timer</th>
                      <th style="width: 14%; text-align: right;">Action</th>
                    </tr>
                  </thead>
                  <tbody id="remove-events-table-tbody">
                    <!-- Populated dynamically -->
                  </tbody>
                </table>
              </div>

              <div class="admin-table-footer">
                <span id="remove-events-footer-count" class="admin-table-count-text">0 Events available</span>
                <span class="admin-quick-legend">${icon('Trash2', 14)} Click <strong>Remove Event</strong> to permanently delete an event with confirmation.</span>
              </div>
            </div>
          </section>

          <!-- ================= TAB 4: REGISTER EVENT ================= -->
          <section id="view-event-register-tab" class="admin-tab-section" style="display: none;">
            <div class="admin-section-header">
              <div class="header-split-row">
                <div>
                  <div class="title-with-pill">
                    <h1 class="admin-view-heading">Register Event</h1>
                    <span class="count-pill-modern" id="reg-event-badge">Select Event</span>
                  </div>
                  <p class="admin-view-desc">Enroll platform engineers into upcoming competitive events. Participants are updated and synchronized in real time.</p>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                  <button id="btn-reg-header-add-event" class="btn btn-primary btn-pill-sm" style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.82rem; padding: 0.45rem 0.85rem; background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); border: none; color: #ffffff; font-weight: 700;">
                    ${icon('PlusCircle', 14)} <span>Add Event</span>
                  </button>
                  <button id="btn-reg-header-manage-events" class="btn btn-secondary btn-pill-sm" style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.82rem; padding: 0.45rem 0.85rem;">
                    ${icon('List', 14)} <span>Manage All Events</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Target Event Selector Bar -->
            <div class="admin-card" style="padding: 1.25rem 1.5rem; margin-bottom: 1.5rem; border-radius: var(--radius-xl); background: #ffffff; border: 1.5px solid var(--border-card);">
              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 280px; flex-wrap: wrap;">
                  <span style="font-weight: 700; font-size: 0.9rem; color: var(--text-main); white-space: nowrap; display: flex; align-items: center; gap: 0.4rem;">
                    ${icon('Trophy', 16)} Choose Event:
                  </span>
                  <select id="reg-event-selector" class="admin-select-filter" style="flex: 1; max-width: 400px; min-width: 200px;">
                    <option value="">-- Choose an Event to Register Users --</option>
                  </select>
                </div>
                <div id="reg-selected-event-stats" style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
                  <!-- Dynamically populated with status, count, domain -->
                </div>
              </div>
            </div>

            <!-- Dual Columns: Quick Register User + Batch Platform Engineers -->
            <div style="display: grid; grid-template-columns: 360px 1fr; gap: 1.5rem; align-items: start;">
              <!-- Left: Direct Register User Form -->
              <div class="admin-card" style="padding: 1.75rem; border-radius: var(--radius-xl); background: #ffffff; border: 1.5px solid var(--border-card);">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.25rem;">
                  <span class="modal-badge-chip">${icon('UserPlus', 14)} DIRECT REGISTRATION</span>
                </div>
                <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--text-main); margin: 0 0 0.4rem;">Enroll Participant</h3>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0 0 1.25rem;">Pick an existing engineer from the platform or register manually.</p>

                <form id="form-quick-register-user">
                  <div class="form-group" style="margin-bottom: 1rem;">
                    <label class="form-label">Pick From Registered Users</label>
                    <select id="quick-reg-user-pick" class="auth-input">
                      <option value="">-- Select Platform Engineer --</option>
                    </select>
                  </div>

                  <div class="form-group" style="margin-bottom: 1rem;">
                    <label class="form-label">Engineer Name</label>
                    <input type="text" id="quick-reg-name" class="auth-input" placeholder="e.g. Charan" required />
                  </div>

                  <div class="form-group" style="margin-bottom: 1.25rem;">
                    <label class="form-label">Engineer Email</label>
                    <input type="email" id="quick-reg-email" class="auth-input" placeholder="e.g. charan@gmail.com" required />
                  </div>

                  <button type="submit" id="btn-submit-quick-reg" class="btn btn-primary btn-pill" style="width: 100%; justify-content: center;">
                    <span>${icon('UserCheck', 15)} Register Participant</span>
                  </button>
                </form>
              </div>

              <!-- Right: Platform Users with 1-Click Register -->
              <div class="admin-table-container">
                <div class="admin-toolbar">
                  <div class="admin-search-wrapper">
                    <span class="search-icon">${icon('Search', 15)}</span>
                    <input
                      type="text"
                      id="reg-users-search-input"
                      class="admin-search-field"
                      placeholder="Search platform engineers to register by name, email, or discipline..."
                    />
                  </div>
                  <div class="admin-filters-group">
                    <button id="btn-refresh-reg-users" class="admin-toolbar-btn btn-refresh-records" title="Refresh records">
                      <span class="toolbar-btn-icon">${icon('RotateCw', 14)}</span>
                      <span>Refresh</span>
                    </button>
                  </div>
                </div>

                <div class="table-responsive">
                  <table class="admin-users-table">
                    <thead>
                      <tr>
                        <th style="width: 35%;">Engineer</th>
                        <th style="width: 25%;">Email &amp; Discipline</th>
                        <th style="width: 15%;">Points XP</th>
                        <th style="width: 25%; text-align: right;">Registration</th>
                      </tr>
                    </thead>
                    <tbody id="reg-users-table-tbody">
                      <tr>
                        <td colspan="4" style="text-align: center; padding: 3rem 2rem;">
                          <span style="color: var(--text-muted);">Please select a target event above to manage registrations.</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div class="admin-table-footer">
                  <span id="reg-users-footer-count" class="admin-table-count-text">Ready to register participants</span>
                  <span class="admin-quick-legend">${icon('CheckCircle2', 14)} Click <strong>Register</strong> to enroll user instantly without page refresh.</span>
                </div>
              </div>
            </div>
          </section>

          <!-- ================= TAB 5: EVENT PARTICIPANTS ================= -->
          <section id="view-event-participants-tab" class="admin-tab-section" style="display: none;">
            <div class="admin-section-header">
              <div class="header-split-row">
                <div>
                  <div class="title-with-pill">
                    <h1 class="admin-view-heading">Event Participants</h1>
                    <span class="count-pill-modern" id="part-total-badge">0 Participants</span>
                  </div>
                  <p class="admin-view-desc">View, audit, filter, and manage registered participants across all competitive events.</p>
                </div>
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                  <button id="btn-part-header-add-event" class="btn btn-primary btn-pill-sm" style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.82rem; padding: 0.45rem 0.85rem; background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); border: none; color: #ffffff; font-weight: 700;">
                    ${icon('PlusCircle', 14)} <span>Add Event</span>
                  </button>
                  <button id="btn-export-participants-csv" class="btn btn-secondary btn-pill">
                    <span>${icon('Download', 14)} Export Participants CSV</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Event Selector & Status Bar -->
            <div class="admin-card" style="padding: 1.25rem 1.5rem; margin-bottom: 1.5rem; border-radius: var(--radius-xl); background: #ffffff; border: 1.5px solid var(--border-card);">
              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 280px; flex-wrap: wrap;">
                  <span style="font-weight: 700; font-size: 0.9rem; color: var(--text-main); white-space: nowrap; display: flex; align-items: center; gap: 0.4rem;">
                    ${icon('Users', 16)} Selected Event:
                  </span>
                  <select id="part-filter-event" class="admin-select-filter" style="flex: 1; max-width: 440px; min-width: 220px;">
                    <option value="">-- Choose an Event to View Participants --</option>
                  </select>
                </div>
                <div id="part-event-metrics" style="display: flex; align-items: center; gap: 0.75rem;">
                  <!-- Populated dynamically with event domain and status pill -->
                </div>
              </div>
            </div>

            <div class="admin-table-container">
              <div class="admin-toolbar">
                <div class="admin-search-wrapper">
                  <span class="search-icon">${icon('Search', 15)}</span>
                  <input
                    type="text"
                    id="part-search-input"
                    class="admin-search-field"
                    placeholder="Search enrolled participants by name or email..."
                  />
                </div>

                <div class="admin-filters-group">
                  <button id="btn-refresh-part-list" class="admin-toolbar-btn btn-refresh-records" title="Refresh participants from Turso DB">
                    <span class="toolbar-btn-icon">${icon('RotateCw', 14)}</span>
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              <div class="table-responsive">
                <table class="admin-users-table">
                  <thead>
                    <tr>
                      <th style="width: 28%;">Participant Name</th>
                      <th style="width: 24%;">Email Address</th>
                      <th style="width: 22%;">Enrolled Event</th>
                      <th style="width: 14%;">Registered At</th>
                      <th style="width: 12%; text-align: right;">Action</th>
                    </tr>
                  </thead>
                  <tbody id="part-table-tbody">
                    <tr>
                      <td colspan="5" style="text-align: center; padding: 4rem 2rem;">
                        <div class="admin-loading-spinner"></div>
                        <span style="color: var(--text-muted); font-size: 0.95rem; margin-top: 0.5rem; display: block;">Loading enrolled participants...</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="admin-table-footer">
                <span id="part-table-footer-count" class="admin-table-count-text">Registered participants</span>
                <span class="admin-quick-legend">${icon('ShieldCheck', 14)} Enrolled participants are authorized to enter the synchronized live quiz room.</span>
              </div>
            </div>
          </section>

          <!-- ================= TAB 6: QUESTION MANAGEMENT ================= -->
          <section id="view-event-questions-tab" class="admin-tab-section" style="display: none;">
            <div class="admin-section-header">
              <div class="header-split-row">
                <div>
                  <div class="title-with-pill">
                    <h1 class="admin-view-heading">Question Management</h1>
                    <span class="count-pill-modern" id="qm-questions-badge">0 Questions</span>
                  </div>
                  <p class="admin-view-desc">Add, edit, delete, organize, and manage questions for live engineering competitions.</p>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                  <button id="btn-qm-header-add-event" class="btn btn-secondary btn-pill-sm" style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.82rem; padding: 0.45rem 0.85rem; font-weight: 600;">
                    ${icon('PlusCircle', 14)} <span>Add Event</span>
                  </button>
                  <button id="btn-qm-add-question" class="btn btn-primary btn-pill">
                    <span>${icon('Plus', 15)} Add New Question</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Event Selector & Metrics Bar -->
            <div class="admin-card" style="padding: 1.25rem 1.5rem; margin-bottom: 1.5rem; border-radius: var(--radius-xl); background: #ffffff; border: 1.5px solid var(--border-card);">
              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 280px; flex-wrap: wrap;">
                  <span style="font-weight: 700; font-size: 0.9rem; color: var(--text-main); white-space: nowrap; display: flex; align-items: center; gap: 0.4rem;">
                    ${icon('Trophy', 16)} Select Event:
                  </span>
                  <select id="qm-event-selector" class="admin-select-filter" style="flex: 1; max-width: 400px; min-width: 200px;">
                    <option value="">-- Choose an Event to Manage Questions --</option>
                  </select>
                </div>
                <div id="qm-event-metrics" style="display: flex; align-items: center; gap: 1.25rem; flex-wrap: wrap;">
                  <!-- Populated dynamically with question count, points, duration -->
                </div>
              </div>
            </div>

            <!-- Questions Table Container -->
            <div class="admin-table-container">
              <div class="admin-toolbar">
                <div class="admin-search-wrapper">
                  <span class="search-icon">${icon('Search', 15)}</span>
                  <input
                    type="text"
                    id="qm-search-input"
                    class="admin-search-field"
                    placeholder="Search questions by text or explanation..."
                  />
                </div>
                <div class="admin-filters-group">
                  <button id="btn-refresh-qm" class="admin-toolbar-btn btn-refresh-records" title="Refresh questions from database">
                    <span class="toolbar-btn-icon">${icon('RotateCw', 14)}</span>
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              <div class="table-responsive">
                <table class="admin-users-table">
                  <thead>
                    <tr>
                      <th style="width: 7%;">Order</th>
                      <th style="width: 38%;">Question Text</th>
                      <th style="width: 25%;">Options &amp; Correct Choice</th>
                      <th style="width: 10%;">Points</th>
                      <th style="width: 8%;">Timer</th>
                      <th style="width: 12%; text-align: right;">Actions</th>
                    </tr>
                  </thead>
                  <tbody id="qm-table-tbody">
                    <tr>
                      <td colspan="6" style="text-align: center; padding: 4rem 2rem;">
                        <span style="color: var(--text-muted);">Please select an event above to view and manage its questions.</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="admin-table-footer">
                <span id="qm-table-footer-count" class="admin-table-count-text">Questions bank</span>
                <span class="admin-quick-legend">${icon('Lightbulb', 14)} Questions are broadcast in sequence order during the live competition.</span>
              </div>
            </div>
          </section>

          <!-- ================= TAB 7: EXAM MANAGEMENT ================= -->
          <section id="view-event-exam-tab" class="admin-tab-section" style="display: none;">
            <div class="admin-section-header">
              <div class="header-split-row">
                <div>
                  <div class="title-with-pill">
                    <h1 class="admin-view-heading">Exam Management</h1>
                    <span class="count-pill-modern" id="exam-mgmt-badge">Live Controller</span>
                  </div>
                  <p class="admin-view-desc">Server-driven live event controller: start exam, send/next questions, control question timers, pause/resume, and end exam.</p>
                </div>
                <div style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap;">
                  <button id="btn-exam-header-add-event" class="btn btn-secondary btn-pill-sm" style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.82rem; padding: 0.45rem 0.85rem; font-weight: 600;">
                    ${icon('PlusCircle', 14)} <span>Add Event</span>
                  </button>
                  <div class="portal-stat-pill" style="border-color: #86efac; background: rgba(34, 197, 94, 0.15); color: #15803d;" id="exam-ws-status-pill">
                    <span class="pulse-dot"></span>
                    <span style="font-weight: 700; font-size: 0.78rem;">Live WebSocket Active</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Active Event Selector -->
            <div class="admin-card" style="padding: 1.25rem 1.5rem; margin-bottom: 1.5rem; border-radius: var(--radius-xl); background: #ffffff; border: 1.5px solid var(--border-card);">
              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 280px; flex-wrap: wrap;">
                  <span style="font-weight: 700; font-size: 0.9rem; color: var(--text-main); white-space: nowrap; display: flex; align-items: center; gap: 0.4rem;">
                    ${icon('PlayCircle', 16)} Control Event:
                  </span>
                  <select id="exam-event-selector" class="admin-select-filter" style="flex: 1; max-width: 400px; min-width: 200px;">
                    <option value="">-- Choose an Event to Broadcast &amp; Control --</option>
                  </select>
                </div>
                <div id="exam-selected-event-tags" style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
                  <!-- Status tags -->
                </div>
              </div>
            </div>

            <!-- Dynamic Exam Control Viewport -->
            <div id="exam-mgmt-viewport">
              <div style="text-align: center; padding: 4rem 2rem; background: #ffffff; border-radius: var(--radius-xl); border: 1.5px solid var(--border-card);">
                <span style="color: var(--text-muted); display: block; margin-bottom: 0.5rem;">${icon('PlayCircle', 42)}</span>
                <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.35rem;">Select an Event to Open Exam Controller</h3>
                <p style="color: var(--text-muted); font-size: 0.9rem; max-width: 460px; margin: 0 auto;">
                  Control the live event: Start Exam, Send/Next Question, Question Timer, Pause/Resume, and End Exam.
                </p>
              </div>
            </div>
          </section>

          <!-- ================= TAB 8: EVENT SCOREBOARD ================= -->
          <section id="view-event-scoreboard-tab" class="admin-tab-section" style="display: none;">
            <div class="admin-section-header">
              <div class="header-split-row">
                <div>
                  <div class="title-with-pill">
                    <h1 class="admin-view-heading">Event Scoreboard</h1>
                    <span class="count-pill-modern" id="sb-event-badge">Leaderboard</span>
                  </div>
                  <p class="admin-view-desc">Display the live and final event leaderboard with participant rankings, scores, and results.</p>
                </div>
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                  <button id="btn-sb-header-add-event" class="btn btn-secondary btn-pill-sm" style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.82rem; padding: 0.45rem 0.85rem; font-weight: 600;">
                    ${icon('PlusCircle', 14)} <span>Add Event</span>
                  </button>
                  <button id="btn-export-scoreboard-csv" class="btn btn-secondary btn-pill">
                    <span>${icon('Download', 14)} Export Scoreboard CSV</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Scoreboard Event Selector -->
            <div class="admin-card" style="padding: 1.25rem 1.5rem; margin-bottom: 1.5rem; border-radius: var(--radius-xl); background: #ffffff; border: 1.5px solid var(--border-card);">
              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 280px; flex-wrap: wrap;">
                  <span style="font-weight: 700; font-size: 0.9rem; color: var(--text-main); white-space: nowrap; display: flex; align-items: center; gap: 0.4rem;">
                    ${icon('Award', 16)} Scoreboard Event:
                  </span>
                  <select id="sb-event-selector" class="admin-select-filter" style="flex: 1; max-width: 400px; min-width: 200px;">
                    <option value="">-- Choose an Event to View Scoreboard --</option>
                  </select>
                </div>
                <div id="sb-event-status-pill" style="display: flex; align-items: center; gap: 0.75rem;">
                  <!-- Dynamic status pill -->
                </div>
              </div>
            </div>

            <!-- Dynamic Scoreboard Viewport (Podium + Table) -->
            <div id="sb-content-viewport">
              <div style="text-align: center; padding: 4rem 2rem; background: #ffffff; border-radius: var(--radius-xl); border: 1.5px solid var(--border-card);">
                <span style="color: var(--text-muted); display: block; margin-bottom: 0.5rem;">${icon('Award', 42)}</span>
                <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.35rem;">Select an Event to Display Scoreboard</h3>
                <p style="color: var(--text-muted); font-size: 0.9rem; max-width: 460px; margin: 0 auto;">
                  View live synchronized rankings, points, and final competition standings.
                </p>
              </div>
            </div>
          </section>
        </main>
      </div>

      <!-- ================= MODAL: USER DETAILS ================= -->
      <div id="admin-user-modal" class="admin-modal-overlay" style="display: none;">
        <div class="admin-modal-card">
          <div class="admin-modal-header">
            <div class="modal-header-title">
              <span class="modal-badge-chip">${icon('User', 14)} ENGINEER PROFILE</span>
              <h2 id="modal-user-name">User Profile</h2>
            </div>
            <button id="btn-close-user-modal" class="btn-close-modal" aria-label="Close modal">${icon('X', 18)}</button>
          </div>
          <div class="admin-modal-body" id="modal-user-content">
            <!-- Dynamically populated -->
          </div>
        </div>
      </div>

      <!-- ================= MODAL: ADD ADMIN ================= -->
      <div id="admin-add-modal" class="admin-modal-overlay" style="display: none;">
        <div class="admin-modal-card">
          <div class="admin-modal-header">
            <div class="modal-header-title">
              <span class="modal-badge-chip" style="color: #16a34a;">${icon('Shield', 14)} SECURITY PRIVILEGES</span>
              <h2>Add New Administrator</h2>
            </div>
            <button id="btn-close-add-modal" class="btn-close-modal" aria-label="Close modal">${icon('X', 18)}</button>
          </div>
          <form id="form-add-admin" class="admin-modal-body" novalidate>
            <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 1.25rem;">
              Create an authorized administrator account with access to the Engiverse dashboard.
            </p>

            <div class="form-group" style="margin-bottom: 1rem;">
              <label class="form-label" for="new-admin-name">Full Name</label>
              <div class="input-wrapper">
                <span class="input-icon">${icon('User', 16)}</span>
                <input type="text" id="new-admin-name" class="auth-input" placeholder="e.g. Vikramaditya Sengupta" required />
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 1rem;">
              <label class="form-label" for="new-admin-email">Admin Email Address</label>
              <div class="input-wrapper">
                <span class="input-icon">${icon('Mail', 16)}</span>
                <input type="email" id="new-admin-email" class="auth-input" placeholder="e.g. vikram.admin@engiverse.io" required />
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 1rem;">
              <label class="form-label" for="new-admin-role">Administrator Role</label>
              <div class="input-wrapper">
                <span class="input-icon">${icon('Award', 16)}</span>
                <select id="new-admin-role" class="auth-input" style="cursor: pointer;">
                  <option value="SUPERADMIN">SUPERADMIN (Superadministrator)</option>
                  <option value="ADMIN" selected>ADMIN (Administrator)</option>
                </select>
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 1.5rem;">
              <label class="form-label" for="new-admin-pwd">Security Password / Master Key</label>
              <div class="input-wrapper">
                <span class="input-icon">${icon('Lock', 16)}</span>
                <input type="password" id="new-admin-pwd" class="auth-input" placeholder="Enter secure admin password" required />
              </div>
            </div>

            <div class="modal-actions-row">
              <button type="button" id="btn-cancel-add-admin" class="btn btn-secondary btn-pill">
                <span>Cancel</span>
              </button>
              <button type="submit" id="btn-submit-new-admin" class="btn btn-primary btn-pill">
                <span>Authorize & Create Admin</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- ================= MODAL: CREATE EVENT ================= -->
      <div id="admin-create-event-modal" class="admin-modal-overlay" style="display: none;">
        <div class="admin-modal-card">
          <div class="admin-modal-header">
            <div class="modal-header-title">
              <span class="modal-badge-chip">${icon('Trophy', 14)} NEW EVENT</span>
              <h2>Create Live Competitive Event</h2>
            </div>
            <button id="btn-close-create-event-modal" class="btn-close-modal" aria-label="Close modal">${icon('X', 18)}</button>
          </div>
          <form id="form-create-event" class="admin-modal-body">
            <div class="form-group" style="margin-bottom: 1rem;">
              <label class="form-label" for="new-event-title">Event Title</label>
              <div class="input-wrapper">
                <span class="input-icon">${icon('Trophy', 16)}</span>
                <input type="text" id="new-event-title" class="auth-input" placeholder="e.g. All-India Robotics &amp; Automation Derby" required />
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 1rem;">
              <label class="form-label" for="new-event-desc">Description</label>
              <div class="input-wrapper">
                <span class="input-icon">${icon('FileText', 16)}</span>
                <input type="text" id="new-event-desc" class="auth-input" placeholder="e.g. 5-round synchronized real-time challenge" />
              </div>
            </div>

            <div class="form-row-2col" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
              <div class="form-group">
                <label class="form-label" for="new-event-domain">Engineering Domain</label>
                <div class="input-wrapper">
                  <span class="input-icon">${icon('Cpu', 16)}</span>
                  <select id="new-event-domain" class="auth-input">
                    <option value="Computer Systems">Computer Systems</option>
                    <option value="Electronics &amp; VLSI">Electronics &amp; VLSI</option>
                    <option value="Mechanical &amp; Aerospace">Mechanical &amp; Aerospace</option>
                    <option value="Civil &amp; Structural">Civil &amp; Structural</option>
                    <option value="Chemical &amp; Bio">Chemical &amp; Bio</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label" for="new-event-timer">Timer Per Question (sec)</label>
                <div class="input-wrapper">
                  <span class="input-icon">${icon('Clock', 16)}</span>
                  <input type="number" id="new-event-timer" class="auth-input" value="30" min="5" max="180" required />
                </div>
              </div>
            </div>

            <div class="modal-actions-row">
              <button type="button" id="btn-cancel-create-event" class="btn btn-secondary btn-pill">
                <span>Cancel</span>
              </button>
              <button type="submit" id="btn-submit-create-event" class="btn btn-primary btn-pill">
                <span>Create &amp; Broadcast Event</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- ================= MODAL: ALL EVENTS DIRECTORY & MANAGER ================= -->
      <div id="admin-all-events-modal" class="admin-modal-overlay" style="display: none;">
        <div class="admin-modal-card" style="max-width: 920px; width: 95%;">
          <div class="admin-modal-header">
            <div class="modal-header-title">
              <span class="modal-badge-chip">${icon('Trophy', 14)} EVENTS DIRECTORY</span>
              <h2>Manage Competitive Events</h2>
            </div>
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <button id="btn-modal-create-event" class="btn btn-primary btn-pill-sm" style="background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); border: none; color: #fff; font-weight: 700; padding: 0.42rem 0.85rem; font-size: 0.82rem;">
                ${icon('PlusCircle', 14)} <span>Add New Event</span>
              </button>
              <button id="btn-close-all-events-modal" class="btn-close-modal" aria-label="Close modal">${icon('X', 18)}</button>
            </div>
          </div>
          <div class="admin-modal-body" style="max-height: 72vh; overflow-y: auto;">
            <p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 1.25rem;">
              Overview of all competitive events. You can quickly add new events, launch them in any module, or permanently remove obsolete events.
            </p>
            <div class="table-responsive">
              <table class="admin-users-table">
                <thead>
                  <tr>
                    <th style="width: 32%;">Event Title &amp; Domain</th>
                    <th style="width: 14%;">Status</th>
                    <th style="width: 12%;">Participants</th>
                    <th style="width: 12%;">Questions</th>
                    <th style="width: 30%; text-align: right;">Actions</th>
                  </tr>
                </thead>
                <tbody id="modal-all-events-tbody">
                  <!-- Populated dynamically -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- ================= MODAL: QUESTIONS MANAGER ================= -->
      <div id="admin-questions-modal" class="admin-modal-overlay" style="display: none;">
        <div class="admin-modal-card" style="max-width: 740px;">
          <div class="admin-modal-header" style="align-items: center;">
            <div class="modal-header-title">
              <span class="modal-badge-chip" id="modal-questions-badge-chip">${icon('PlusCircle', 14)} ADD NEW QUESTION</span>
              <h2 id="modal-questions-event-title" style="margin-top: 0.25rem;">Event Questions</h2>
            </div>
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <button id="btn-modal-toggle-view" class="btn btn-secondary btn-pill-sm" type="button" style="font-size: 0.78rem; padding: 0.35rem 0.75rem;">
                ${icon('List', 13)} <span id="label-modal-toggle-view">View Questions List</span>
              </button>
              <button id="btn-close-questions-modal" class="btn-close-modal" aria-label="Close modal">${icon('X', 18)}</button>
            </div>
          </div>
          <div class="admin-modal-body" style="max-height: 75vh; overflow-y: auto; padding: 1.5rem;">
            <!-- VIEW 1: ADD NEW QUESTION ONLY (NO PREVIOUS QUESTIONS) -->
            <div id="modal-subview-add-question">
              <form id="form-add-question">
                <div class="form-group" style="margin-bottom: 1.15rem;">
                  <label class="form-label" for="new-q-text" style="font-weight: 700;">Question Text</label>
                  <textarea id="new-q-text" class="auth-input" rows="3" placeholder="Enter problem statement..." required style="resize: vertical; min-height: 75px; font-family: inherit; font-size: 0.92rem;"></textarea>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem; margin-bottom: 1.15rem;">
                  <div class="form-group">
                    <label class="form-label" for="new-q-opt-0" style="font-weight: 700; color: #4f46e5;">Option A</label>
                    <input type="text" id="new-q-opt-0" class="auth-input" placeholder="Option A choice" required />
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="new-q-opt-1" style="font-weight: 700; color: #4f46e5;">Option B</label>
                    <input type="text" id="new-q-opt-1" class="auth-input" placeholder="Option B choice" required />
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="new-q-opt-2" style="font-weight: 700; color: #4f46e5;">Option C</label>
                    <input type="text" id="new-q-opt-2" class="auth-input" placeholder="Option C choice" required />
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="new-q-opt-3" style="font-weight: 700; color: #4f46e5;">Option D</label>
                    <input type="text" id="new-q-opt-3" class="auth-input" placeholder="Option D choice" required />
                  </div>
                </div>

                <div style="display: grid; grid-template-columns: 1.35fr 1fr 1fr; gap: 0.85rem; margin-bottom: 1.15rem;">
                  <div class="form-group">
                    <label class="form-label" for="new-q-correct" style="font-weight: 700; color: #16a34a;">Correct Option</label>
                    <select id="new-q-correct" class="auth-input" style="font-weight: 600;">
                      <option value="0">Option A</option>
                      <option value="1">Option B</option>
                      <option value="2">Option C</option>
                      <option value="3">Option D</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="new-q-timer" style="font-weight: 700;">Timer (Seconds)</label>
                    <input type="number" id="new-q-timer" class="auth-input" value="30" min="5" max="180" required />
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="new-q-points" style="font-weight: 700;">Points</label>
                    <input type="number" id="new-q-points" class="auth-input" value="100" min="10" max="1000" />
                  </div>
                </div>

                <div class="form-group" style="margin-bottom: 1.5rem;">
                  <label class="form-label" for="new-q-explanation">Engineering Explanation (Optional)</label>
                  <input type="text" id="new-q-explanation" class="auth-input" placeholder="Explanation revealed after question timer ends..." />
                </div>

                <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.75rem; padding-top: 1rem; border-top: 1px solid var(--border-card);">
                  <button type="reset" class="btn btn-secondary btn-pill">
                    <span>Clear Form</span>
                  </button>
                  <button type="submit" id="btn-submit-add-question" class="btn btn-primary btn-pill" style="background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); box-shadow: 0 4px 14px rgba(109, 40, 217, 0.35); min-width: 160px; justify-content: center;">
                    <span>${icon('PlusCircle', 15)} Add Question</span>
                  </button>
                </div>
              </form>
            </div>

            <!-- VIEW 2: QUESTIONS LIST / MANAGE QUESTIONS (SEPARATE VIEW) -->
            <div id="modal-subview-list-questions" style="display: none;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                <span style="font-size: 0.88rem; font-weight: 700; color: var(--text-main);" id="modal-questions-count-summary">
                  Existing Questions
                </span>
                <button id="btn-modal-switch-to-add" class="btn btn-primary btn-pill-sm" type="button" style="font-size: 0.78rem;">
                  ${icon('PlusCircle', 13)} <span>Add Another Question</span>
                </button>
              </div>
              <div class="admin-table-container" style="max-height: 380px; overflow-y: auto;">
                <table class="admin-data-table">
                  <thead>
                    <tr>
                      <th style="width: 8%;">#</th>
                      <th style="width: 50%;">Question</th>
                      <th style="width: 15%;">Correct</th>
                      <th style="width: 12%;">Timer</th>
                      <th style="width: 15%; text-align: right;">Action</th>
                    </tr>
                  </thead>
                  <tbody id="modal-questions-tbody">
                    <!-- Populated dynamically -->
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ================= MODAL: REGISTERED PARTICIPANTS ================= -->
      <div id="admin-participants-modal" class="admin-modal-overlay" style="display: none;">
        <div class="admin-modal-card">
          <div class="admin-modal-header">
            <div class="modal-header-title">
              <span class="modal-badge-chip">${icon('Users', 14)} REGISTERED PARTICIPANTS</span>
              <h2 id="modal-participants-event-title">Event Participants</h2>
            </div>
            <button id="btn-close-participants-modal" class="btn-close-modal" aria-label="Close modal">${icon('X', 18)}</button>
          </div>
          <div class="admin-modal-body" style="max-height: 60vh; overflow-y: auto;">
            <div class="admin-table-container">
              <table class="admin-data-table">
                <thead>
                  <tr>
                    <th style="width: 10%;">#</th>
                    <th style="width: 45%;">Participant</th>
                    <th style="width: 45%;">Registered At</th>
                  </tr>
                </thead>
                <tbody id="modal-participants-tbody">
                  <!-- Populated dynamically -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- ================= MODAL: EDIT QUESTION ================= -->
      <div id="admin-edit-question-modal" class="admin-modal-overlay" style="display: none;">
        <div class="admin-modal-card" style="max-width: 650px;">
          <div class="admin-modal-header">
            <div class="modal-header-title">
              <span class="modal-badge-chip">${icon('Edit3', 14)} EDIT QUESTION</span>
              <h2>Modify Question Details</h2>
            </div>
            <button id="btn-close-edit-q-modal" class="btn-close-modal" aria-label="Close modal">${icon('X', 18)}</button>
          </div>
          <form id="form-edit-question" class="admin-modal-body">
            <input type="hidden" id="edit-q-id" />
            <input type="hidden" id="edit-q-event-id" />

            <div class="form-group" style="margin-bottom: 0.85rem;">
              <label class="form-label" for="edit-q-text">Question Text</label>
              <input type="text" id="edit-q-text" class="auth-input" placeholder="Question statement..." required />
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.85rem;">
              <div>
                <label class="form-label">Option A</label>
                <input type="text" id="edit-q-opt-0" class="auth-input" placeholder="Option A" required />
              </div>
              <div>
                <label class="form-label">Option B</label>
                <input type="text" id="edit-q-opt-1" class="auth-input" placeholder="Option B" required />
              </div>
              <div>
                <label class="form-label">Option C</label>
                <input type="text" id="edit-q-opt-2" class="auth-input" placeholder="Option C" required />
              </div>
              <div>
                <label class="form-label">Option D</label>
                <input type="text" id="edit-q-opt-3" class="auth-input" placeholder="Option D" required />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem; margin-bottom: 0.85rem;">
              <div>
                <label class="form-label">Correct Option</label>
                <select id="edit-q-correct" class="auth-input">
                  <option value="0">Option A</option>
                  <option value="1">Option B</option>
                  <option value="2">Option C</option>
                  <option value="3">Option D</option>
                </select>
              </div>
              <div>
                <label class="form-label">Timer (seconds)</label>
                <input type="number" id="edit-q-timer" class="auth-input" value="30" min="5" max="180" />
              </div>
              <div>
                <label class="form-label">Points</label>
                <input type="number" id="edit-q-points" class="auth-input" value="100" min="10" max="1000" />
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 1.25rem;">
              <label class="form-label">Engineering Explanation</label>
              <input type="text" id="edit-q-explanation" class="auth-input" placeholder="Detailed engineering rationale..." />
            </div>

            <div class="modal-actions-row">
              <button type="button" id="btn-cancel-edit-q" class="btn btn-secondary btn-pill">
                <span>Cancel</span>
              </button>
              <button type="submit" id="btn-submit-edit-q" class="btn btn-primary btn-pill">
                <span>${icon('Save', 14)} Update Question</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  // State
  type AdminTab =
    | 'users'
    | 'admins'
    | 'events'
    | 'add-event'
    | 'remove-event'
    | 'event-register'
    | 'event-participants'
    | 'event-questions'
    | 'event-exam'
    | 'event-scoreboard';

  let activeTab: AdminTab = 'users';
  let allUsers: AdminUserRecord[] = [];
  let allAdmins: AdminRecord[] = [];
  let allEvents: QuizEvent[] = [];
  let stats: AdminStats | null = null;

  // Selected event tracking across all modules
  let regSelectedEventId = '';
  let partSelectedEventId = 'ALL';
  let qmSelectedEventId = '';
  let examSelectedEventId = '';
  let sbSelectedEventId = '';

  // Live Host State
  let activeHostEvent: QuizEvent | null = null;
  let hostQuestions: EventQuestion[] = [];
  let hostLeaderboard: LeaderboardEntry[] = [];
  let hostRemainingSeconds = 30;
  let hostTotalQuestionSeconds = 30;
  let hostCurrentQuestionIdx = -1;
  let hostCurrentQuestion: EventQuestion | null = null;
  let hostEventStatus: string = 'LOBBY';
  let hostQuestionAnswerCount = 0;
  let currentQuestionsModalEventId: string | null = null;

  // Selectors
  const shellLayout = container.querySelector<HTMLElement>('#admin-shell');
  const sidebar = container.querySelector<HTMLElement>('#admin-sidebar');
  const sidebarBackdrop = container.querySelector<HTMLElement>('#sidebar-backdrop');
  const btnOpenSidebar = container.querySelector<HTMLButtonElement>('#btn-open-sidebar');
  const btnCloseSidebar = container.querySelector<HTMLButtonElement>('#btn-close-sidebar');

  // Navigation Buttons
  const tabBtnUsers = container.querySelector<HTMLButtonElement>('#tab-btn-users');
  const tabBtnAdmins = container.querySelector<HTMLButtonElement>('#tab-btn-admins');
  const tabBtnEvents = container.querySelector<HTMLButtonElement>('#tab-btn-events');
  const tabBtnAddEvent = container.querySelector<HTMLButtonElement>('#tab-btn-add-event');
  const tabBtnRemoveEvent = container.querySelector<HTMLButtonElement>('#tab-btn-remove-event');
  const tabBtnEventRegister = container.querySelector<HTMLButtonElement>('#tab-btn-event-register');
  const tabBtnEventParticipants = container.querySelector<HTMLButtonElement>('#tab-btn-event-participants');
  const tabBtnEventQuestions = container.querySelector<HTMLButtonElement>('#tab-btn-event-questions');
  const tabBtnEventExam = container.querySelector<HTMLButtonElement>('#tab-btn-event-exam');
  const tabBtnEventScoreboard = container.querySelector<HTMLButtonElement>('#tab-btn-event-scoreboard');

  // Section Views
  const viewUsersTab = container.querySelector<HTMLElement>('#view-users-tab');
  const viewAdminsTab = container.querySelector<HTMLElement>('#view-admins-tab');
  const viewEventsTab = container.querySelector<HTMLElement>('#view-events-tab');
  const viewAddEventTab = container.querySelector<HTMLElement>('#view-add-event-tab');
  const viewRemoveEventTab = container.querySelector<HTMLElement>('#view-remove-event-tab');
  const viewEventRegisterTab = container.querySelector<HTMLElement>('#view-event-register-tab');
  const viewEventParticipantsTab = container.querySelector<HTMLElement>('#view-event-participants-tab');
  const viewEventQuestionsTab = container.querySelector<HTMLElement>('#view-event-questions-tab');
  const viewEventExamTab = container.querySelector<HTMLElement>('#view-event-exam-tab');
  const viewEventScoreboardTab = container.querySelector<HTMLElement>('#view-event-scoreboard-tab');
  const topbarPageLabel = container.querySelector<HTMLElement>('#topbar-page-label');

  const searchInput = container.querySelector<HTMLInputElement>('#admin-search-input');
  const branchFilter = container.querySelector<HTMLSelectElement>('#admin-filter-branch');
  const yearFilter = container.querySelector<HTMLSelectElement>('#admin-filter-year');
  const sortSelect = container.querySelector<HTMLSelectElement>('#admin-sort-by');

  // Modals
  const userModal = container.querySelector<HTMLElement>('#admin-user-modal');
  const modalContent = container.querySelector<HTMLElement>('#modal-user-content');
  const modalUserName = container.querySelector<HTMLElement>('#modal-user-name');
  const btnCloseUserModal = container.querySelector<HTMLButtonElement>('#btn-close-user-modal');

  const addAdminModal = container.querySelector<HTMLElement>('#admin-add-modal');
  const btnOpenAddAdmin = container.querySelector<HTMLButtonElement>('#btn-open-add-admin-modal');
  const btnCloseAddModal = container.querySelector<HTMLButtonElement>('#btn-close-add-modal');
  const btnCancelAddAdmin = container.querySelector<HTMLButtonElement>('#btn-cancel-add-admin');
  const formAddAdmin = container.querySelector<HTMLFormElement>('#form-add-admin');

  // Slide Bar Open / Close Controller (Universal Desktop & Mobile)
  const toggleSidebar = () => {
    soundEngine.playClick();
    const isMobile = window.innerWidth <= 1024;
    if (isMobile) {
      const isOpen = sidebar?.classList.contains('mobile-open');
      if (isOpen) {
        closeSidebar();
      } else {
        openSidebar();
      }
    } else {
      shellLayout?.classList.toggle('sidebar-collapsed');
    }
  };

  const openSidebar = () => {
    const isMobile = window.innerWidth <= 1024;
    if (isMobile) {
      if (sidebar && sidebarBackdrop) {
        sidebar.classList.add('mobile-open');
        sidebarBackdrop.style.display = 'block';
      }
    } else {
      shellLayout?.classList.remove('sidebar-collapsed');
    }
  };

  const closeSidebar = () => {
    const isMobile = window.innerWidth <= 1024;
    if (isMobile) {
      if (sidebar && sidebarBackdrop) {
        sidebar.classList.remove('mobile-open');
        sidebarBackdrop.style.display = 'none';
      }
    } else {
      shellLayout?.classList.add('sidebar-collapsed');
    }
  };

  btnOpenSidebar?.addEventListener('click', toggleSidebar);
  btnCloseSidebar?.addEventListener('click', () => {
    soundEngine.playClick();
    closeSidebar();
  });
  sidebarBackdrop?.addEventListener('click', closeSidebar);


  // Tab Switch Handler
  function switchTab(tab: AdminTab, preselectedEventId?: string) {
    soundEngine.playClick();
    activeTab = tab;
    if (window.innerWidth <= 1024) {
      closeSidebar();
    }

    // Reset all tab button active states
    [
      tabBtnUsers,
      tabBtnAdmins,
      tabBtnEvents,
      tabBtnAddEvent,
      tabBtnRemoveEvent,
      tabBtnEventRegister,
      tabBtnEventParticipants,
      tabBtnEventQuestions,
      tabBtnEventExam,
      tabBtnEventScoreboard
    ].forEach(btn => btn?.classList.remove('active'));

    // Hide all tab views
    [
      viewUsersTab,
      viewAdminsTab,
      viewEventsTab,
      viewAddEventTab,
      viewRemoveEventTab,
      viewEventRegisterTab,
      viewEventParticipantsTab,
      viewEventQuestionsTab,
      viewEventExamTab,
      viewEventScoreboardTab
    ].forEach(sec => {
      if (sec) sec.style.display = 'none';
    });

    if (tab === 'users') {
      tabBtnUsers?.classList.add('active');
      if (viewUsersTab) viewUsersTab.style.display = 'block';
      if (topbarPageLabel) topbarPageLabel.textContent = 'Users Directory';
      filterAndRenderUsers();
    } else if (tab === 'admins') {
      tabBtnAdmins?.classList.add('active');
      if (viewAdminsTab) viewAdminsTab.style.display = 'block';
      if (topbarPageLabel) topbarPageLabel.textContent = 'List of Admins';
      renderAdminsTable();
    } else if (tab === 'events') {
      tabBtnEvents?.classList.add('active');
      if (viewEventsTab) viewEventsTab.style.display = 'block';
      if (topbarPageLabel) topbarPageLabel.textContent = 'Event Management / List of Events';
      loadEventsData();
    } else if (tab === 'add-event' || tab === 'remove-event') {
      tabBtnAddEvent?.classList.add('active');
      if (viewAddEventTab) viewAddEventTab.style.display = 'block';
      if (topbarPageLabel) topbarPageLabel.textContent = 'Event Management / Add & Remove Events';
      if (tab === 'remove-event') {
        const btnRemove = container.querySelector<HTMLButtonElement>('#btn-mode-remove');
        btnRemove?.click();
      } else {
        const btnCreate = container.querySelector<HTMLButtonElement>('#btn-mode-create');
        btnCreate?.click();
      }
      renderAddEventPageRecent();
      renderRemoveEventsPageTable();
    } else if (tab === 'event-register') {
      tabBtnEventRegister?.classList.add('active');
      if (viewEventRegisterTab) viewEventRegisterTab.style.display = 'block';
      if (topbarPageLabel) topbarPageLabel.textContent = 'Event Management / Register Event';
      initEventRegisterModule(preselectedEventId);
    } else if (tab === 'event-participants') {
      tabBtnEventParticipants?.classList.add('active');
      if (viewEventParticipantsTab) viewEventParticipantsTab.style.display = 'block';
      if (topbarPageLabel) topbarPageLabel.textContent = 'Event Management / Event Participants';
      initEventParticipantsModule(preselectedEventId);
    } else if (tab === 'event-questions') {
      tabBtnEventQuestions?.classList.add('active');
      if (viewEventQuestionsTab) viewEventQuestionsTab.style.display = 'block';
      if (topbarPageLabel) topbarPageLabel.textContent = 'Event Management / Question Management';
      initQuestionManagementModule(preselectedEventId);
    } else if (tab === 'event-exam') {
      tabBtnEventExam?.classList.add('active');
      if (viewEventExamTab) viewEventExamTab.style.display = 'block';
      if (topbarPageLabel) topbarPageLabel.textContent = 'Event Management / Exam Management';
      initExamManagementModule(preselectedEventId);
    } else if (tab === 'event-scoreboard') {
      tabBtnEventScoreboard?.classList.add('active');
      if (viewEventScoreboardTab) viewEventScoreboardTab.style.display = 'block';
      if (topbarPageLabel) topbarPageLabel.textContent = 'Event Management / Event Scoreboard';
      initEventScoreboardModule(preselectedEventId);
    }
  }

  tabBtnUsers?.addEventListener('click', () => switchTab('users'));
  tabBtnAdmins?.addEventListener('click', () => switchTab('admins'));
  tabBtnEvents?.addEventListener('click', () => switchTab('events'));
  tabBtnAddEvent?.addEventListener('click', () => switchTab('add-event'));
  tabBtnRemoveEvent?.addEventListener('click', () => switchTab('remove-event'));
  tabBtnEventRegister?.addEventListener('click', () => switchTab('event-register'));
  tabBtnEventParticipants?.addEventListener('click', () => switchTab('event-participants'));
  tabBtnEventQuestions?.addEventListener('click', () => switchTab('event-questions'));
  tabBtnEventExam?.addEventListener('click', () => switchTab('event-exam'));
  tabBtnEventScoreboard?.addEventListener('click', () => switchTab('event-scoreboard'));

  // Cross-Navigation Shortcuts
  container.querySelector('#btn-goto-events-list-from-add')?.addEventListener('click', () => switchTab('events'));
  container.querySelector('#btn-goto-add-from-remove')?.addEventListener('click', () => switchTab('add-event'));
  container.querySelector('#btn-goto-list-from-remove')?.addEventListener('click', () => switchTab('events'));

  // Navigation Links
  container.querySelector('#sidebar-brand-home')?.addEventListener('click', (e) => {
    e.preventDefault();
    soundEngine.playClick();
    onNavigate('landing');
  });

  container.querySelector('#btn-sidebar-logout')?.addEventListener('click', () => {
    soundEngine.playClick();
    sessionStorage.removeItem('engiverse_admin_token');
    sessionStorage.removeItem('engiverse_admin_email');
    sessionStorage.removeItem('engiverse_admin_name');
    showToast('Signed out of Admin Console.', 'info');
    onNavigate('landing');
  });

  // Users Table Database Operational Action Buttons
  container.querySelector('#btn-table-refresh')?.addEventListener('click', () => {
    soundEngine.playClick();
    loadAllData();
  });

  container.querySelector('#btn-table-export')?.addEventListener('click', () => {
    soundEngine.playClick();
    exportToCsv(allUsers);
  });

  // Search & Filters for Engineers
  searchInput?.addEventListener('input', () => filterAndRenderUsers());
  branchFilter?.addEventListener('change', () => filterAndRenderUsers());
  yearFilter?.addEventListener('change', () => filterAndRenderUsers());
  sortSelect?.addEventListener('change', () => filterAndRenderUsers());

  // Search & Filters for Admins
  container.querySelector('#admins-search-input')?.addEventListener('input', () => renderAdminsTable());
  container.querySelector('#admins-filter-role')?.addEventListener('change', () => renderAdminsTable());
  container.querySelector('#admins-sort-by')?.addEventListener('change', () => renderAdminsTable());

  // Admins Table Database Operational Action Buttons
  container.querySelector('#btn-admins-refresh')?.addEventListener('click', () => {
    soundEngine.playClick();
    loadAllData();
  });

  container.querySelector('#btn-admins-export')?.addEventListener('click', () => {
    soundEngine.playClick();
    exportAdminsToCsv(allAdmins);
  });

  // Modal Closures
  btnCloseUserModal?.addEventListener('click', () => {
    if (userModal) userModal.style.display = 'none';
  });
  userModal?.addEventListener('click', (e) => {
    if (e.target === userModal) userModal.style.display = 'none';
  });

  const showAddAdminModal = () => {
    soundEngine.playClick();
    if (addAdminModal) {
      formAddAdmin?.reset();
      addAdminModal.style.display = 'flex';
      container.querySelector<HTMLInputElement>('#new-admin-name')?.focus();
    }
  };

  const hideAddAdminModal = () => {
    if (addAdminModal) addAdminModal.style.display = 'none';
  };

  btnOpenAddAdmin?.addEventListener('click', showAddAdminModal);
  btnCloseAddModal?.addEventListener('click', hideAddAdminModal);
  btnCancelAddAdmin?.addEventListener('click', hideAddAdminModal);
  addAdminModal?.addEventListener('click', (e) => {
    if (e.target === addAdminModal) hideAddAdminModal();
  });

  // Add Admin Form Submit
  formAddAdmin?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameInput = container.querySelector<HTMLInputElement>('#new-admin-name');
    const emailInput = container.querySelector<HTMLInputElement>('#new-admin-email');
    const roleInput = container.querySelector<HTMLSelectElement>('#new-admin-role');
    const pwdInput = container.querySelector<HTMLInputElement>('#new-admin-pwd');
    const submitBtn = container.querySelector<HTMLButtonElement>('#btn-submit-new-admin');

    const name = nameInput?.value.trim() || '';
    const email = emailInput?.value.trim() || '';
    const role = roleInput?.value || 'ADMIN';
    const password = pwdInput?.value || '';

    if (!name || !email || !password) {
      showToast('Please fill out all required admin fields.', 'warn');
      return;
    }

    if (!email.includes('@')) {
      showToast('Please enter a valid email address.', 'warn');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Authorizing...';
    }

    try {
      const res = await apiAddAdmin({ name, email, password, role });
      if (res.success && res.admin) {
        soundEngine.playCorrect();
        showToast(`Administrator ${name} authorized successfully!`, 'success');
        hideAddAdminModal();
        await loadAllData();
      } else {
        showToast(res.error || 'Failed to add administrator.', 'warn');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error while adding administrator.', 'warn');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Authorize & Create Admin';
      }
    }
  });

  // Load All Data from Backend
  async function loadAllData() {
    const syncTime = container.querySelector('#topbar-sync-time');
    if (syncTime) syncTime.textContent = 'Syncing...';

    try {
      const [usersRes, statsRes, adminsRes, eventsRes] = await Promise.all([
        apiGetAdminUsers().catch(e => { console.warn('users fetch error', e); return null; }),
        apiGetAdminStats().catch(e => { console.warn('stats fetch error', e); return null; }),
        apiGetAdminList().catch(e => { console.warn('admins fetch error', e); return null; }),
        apiGetEvents().catch(e => { console.warn('events fetch error', e); return null; })
      ]);

      if (usersRes?.success && Array.isArray(usersRes.users) && usersRes.users.length > 0) {
        allUsers = usersRes.users;
      } else {
        // Fallback directly to Turso DB client
        try {
          const directUsers = await getAllUsersFromTurso();
          if (directUsers && directUsers.length > 0) {
            allUsers = directUsers.map(u => ({
              id: u.id,
              name: u.name,
              email: u.email,
              mobile: u.mobile || '—',
              branch: u.branch || 'Engineering',
              year: u.year || '—',
              avatar: u.avatar || '',
              streak: u.streak || 1,
              xp: u.xp || 250,
              badge: u.badge || 'Verified Engineer',
              createdAt: u.joinedAt || new Date().toISOString()
            }));
          }
        } catch (tursoErr) {
          console.warn('Fallback direct Turso fetch failed:', tursoErr);
        }
      }

      if (statsRes?.success && statsRes.stats) stats = statsRes.stats;
      if (adminsRes?.success && adminsRes.admins) allAdmins = adminsRes.admins;
      if (eventsRes?.success && eventsRes.events) {
        allEvents = eventsRes.events;
        const badgeEvents = container.querySelector('#badge-events-count');
        if (badgeEvents) badgeEvents.textContent = allEvents.length.toString();
      }

      updateBadgesAndMetrics();
      if (activeTab === 'users') {
        filterAndRenderUsers();
      } else if (activeTab === 'admins') {
        renderAdminsTable();
      } else if (activeTab === 'events') {
        filterAndRenderEvents();
      } else if (activeTab === 'add-event' || activeTab === 'remove-event') {
        renderAddEventPageRecent();
        renderRemoveEventsPageTable();
      } else if (activeTab === 'event-register') {
        initEventRegisterModule();
      } else if (activeTab === 'event-participants') {
        initEventParticipantsModule();
      } else if (activeTab === 'event-questions') {
        initQuestionManagementModule();
      } else if (activeTab === 'event-exam') {
        initExamManagementModule();
      } else if (activeTab === 'event-scoreboard') {
        initEventScoreboardModule();
      }

      if (syncTime) syncTime.textContent = `Synced: ${new Date().toLocaleTimeString()}`;
      showToast('Admin data synchronized with Turso DB.', 'info');
    } catch (err) {
      console.error('Failed to load admin data:', err);
      showToast('Error syncing with backend.', 'warn');
    }
  }

  function updateBadgesAndMetrics() {
    const badgeUsers = container.querySelector('#badge-users-count');
    const badgeAdmins = container.querySelector('#badge-admins-count');
    const usersViewCount = container.querySelector('#users-view-count');
    const adminsViewCount = container.querySelector('#admins-view-count');

    if (badgeUsers) badgeUsers.textContent = allUsers.length.toString();
    if (badgeAdmins) badgeAdmins.textContent = allAdmins.length.toString();
    if (usersViewCount) usersViewCount.textContent = `${allUsers.length} Registered`;
    if (adminsViewCount) adminsViewCount.textContent = `${allAdmins.length} Admins`;

    const usersVal = container.querySelector('#metric-total-users');
    const xpVal = container.querySelector('#metric-total-xp');
    const attemptsVal = container.querySelector('#metric-total-attempts');
    const branchVal = container.querySelector('#metric-top-branch');

    const totalUsers = stats ? stats.totalUsers : allUsers.length;
    const totalXp = stats ? stats.totalXp : allUsers.reduce((acc, u) => acc + (u.xp || 0), 0);
    const totalAttempts = stats ? stats.totalAttempts : 5;
    const topBranch = stats?.topBranch ? stats.topBranch.split(' ')[0] : 'CSE';

    if (usersVal) usersVal.textContent = totalUsers.toLocaleString();
    if (xpVal) xpVal.innerHTML = `${icon('Zap', 15)} ${totalXp.toLocaleString()}`;
    if (attemptsVal) attemptsVal.textContent = totalAttempts.toLocaleString();
    if (branchVal) branchVal.textContent = topBranch;
  }

  // Render Users Table
  function filterAndRenderUsers() {
    const query = searchInput?.value.trim().toLowerCase() || '';
    const selectedBranch = branchFilter?.value || 'ALL';
    const selectedYear = yearFilter?.value || 'ALL';
    const sortBy = sortSelect?.value || 'xp-desc';

    let filtered = allUsers.filter(user => {
      const uName = (user.name || '').toLowerCase();
      const uEmail = (user.email || '').toLowerCase();
      const uMobile = (user.mobile || '').toLowerCase();
      const uBranch = (user.branch || '').toLowerCase();
      const uYear = (user.year || '').toLowerCase();

      const matchesSearch =
        !query ||
        uName.includes(query) ||
        uEmail.includes(query) ||
        uMobile.includes(query) ||
        uBranch.includes(query);

      const matchesBranch = selectedBranch === 'ALL' || uBranch.includes(selectedBranch.toLowerCase());
      const matchesYear = selectedYear === 'ALL' || uYear.includes(selectedYear.toLowerCase());

      return matchesSearch && matchesBranch && matchesYear;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'xp-desc') return (b.xp || 0) - (a.xp || 0);
      if (sortBy === 'streak-desc') return (b.streak || 0) - (a.streak || 0);
      if (sortBy === 'newest') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      if (sortBy === 'name-asc') return (a.name || '').localeCompare(b.name || '');
      return 0;
    });

    const tbody = container.querySelector('#admin-users-tbody');
    const countLabel = container.querySelector('#admin-user-count-label');

    if (countLabel) {
      countLabel.textContent = `Showing ${filtered.length} of ${allUsers.length} registered engineers`;
    }

    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 4rem 2rem;">
            <div class="empty-state-wrap">
              <span class="empty-state-icon" style="display: block; margin-bottom: 0.5rem; color: var(--text-muted);">${icon('Search', 36)}</span>
              <h3 style="font-size: 1.15rem; color: var(--text-main); margin-bottom: 0.4rem;">No registered users found</h3>
              <p style="color: var(--text-muted); font-size: 0.9rem; max-width: 400px; margin: 0 auto 1.25rem auto;">
                No engineer records match your current search or filter query.
              </p>
              <button id="btn-empty-seed" class="btn btn-primary btn-pill">
                <span>${icon('Zap', 15)} Seed Sample Users</span>
              </button>
            </div>
          </td>
        </tr>
      `;

      tbody.querySelector('#btn-empty-seed')?.addEventListener('click', async () => {
        soundEngine.playClick();
        await apiSeedUsers();
        await loadAllData();
      });
      return;
    }

    tbody.innerHTML = filtered
      .map(
        u => `
      <tr data-user-id="${u.id}">
        <td>
          <div class="admin-user-cell">
            ${renderAlphabetAvatar(u.name, 'admin-table-avatar')}
            <div class="user-cell-meta">
              <span class="user-cell-name">${escapeHtml(u.name)}</span>
              <span class="user-cell-badge">${escapeHtml(u.badge || 'Engineer')}</span>
            </div>
          </div>
        </td>
        <td>
          <span class="admin-branch-tag ${getBranchClass(u.branch)}">${escapeHtml(u.branch || 'General')}</span>
        </td>
        <td>
          <span class="year-badge">${escapeHtml(u.year || '—')}</span>
        </td>
        <td>
          <span class="streak-tag">${icon('Flame', 13)} ${u.streak || 0}d</span>
        </td>
        <td>
          <span class="xp-tag">${icon('Zap', 13)} ${(u.xp || 0).toLocaleString()}</span>
        </td>
        <td style="text-align: right;">
          <div class="admin-row-actions">
            <button class="btn-action-view" data-id="${u.id}" title="View profile, contact info & registration details for ${escapeHtml(u.name)}">
              ${icon('Eye', 13)} View
            </button>
            <button class="btn-action-delete" data-id="${u.id}" data-name="${escapeHtml(u.name)}" title="Delete user from database">
              ${icon('Trash2', 13)} Delete
            </button>
          </div>
        </td>
      </tr>
    `
      )
      .join('');

    // Attach View Modal Listeners
    tbody.querySelectorAll<HTMLButtonElement>('.btn-action-view').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const user = allUsers.find(u => u.id === id);
        if (user) openUserModal(user);
      });
    });

    // Attach Delete Listeners
    tbody.querySelectorAll<HTMLButtonElement>('.btn-action-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        if (!id) return;

        if (confirm(`Are you sure you want to permanently delete user "${name}" from Turso DB?`)) {
          soundEngine.playClick();
          btn.disabled = true;
          btn.textContent = 'Deleting...';

          try {
            const res = await apiDeleteUser(id);
            if (res.success) {
              showToast(`Deleted ${name} from database.`, 'info');
              allUsers = allUsers.filter(u => u.id !== id);
              filterAndRenderUsers();
              updateBadgesAndMetrics();
            } else {
              showToast(res.message || 'Failed to delete user.', 'warn');
              btn.disabled = false;
              btn.innerHTML = `${icon('Trash2', 12)} Delete`;
            }
          } catch (err) {
            console.error(err);
            showToast('Network error deleting user.', 'warn');
            btn.disabled = false;
            btn.innerHTML = `${icon('Trash2', 12)} Delete`;
          }
        }
      });
    });
  }

  // Render Admins Table
  function renderAdminsTable() {
    const tbody = container.querySelector('#admin-list-tbody');
    const countLabel = container.querySelector('#admin-count-label');
    const adminsViewCount = container.querySelector('#admins-view-count');
    const searchAdminInput = container.querySelector<HTMLInputElement>('#admins-search-input');
    const roleFilter = container.querySelector<HTMLSelectElement>('#admins-filter-role');
    const sortAdminSelect = container.querySelector<HTMLSelectElement>('#admins-sort-by');

    const query = searchAdminInput?.value.trim().toLowerCase() || '';
    const selectedRole = roleFilter?.value || 'ALL';
    const sortBy = sortAdminSelect?.value || 'role';

    let filtered = allAdmins.filter(adm => {
      const matchesSearch =
        !query ||
        adm.name.toLowerCase().includes(query) ||
        adm.email.toLowerCase().includes(query) ||
        adm.id.toLowerCase().includes(query);

      const matchesRole = selectedRole === 'ALL' || adm.role === selectedRole;

      return matchesSearch && matchesRole;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'role') {
        if (a.role === 'SUPERADMIN' && b.role !== 'SUPERADMIN') return -1;
        if (a.role !== 'SUPERADMIN' && b.role === 'SUPERADMIN') return 1;
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return 0;
    });

    if (countLabel) {
      countLabel.textContent = `Showing ${filtered.length} of ${allAdmins.length} active platform administrators`;
    }

    if (adminsViewCount) {
      adminsViewCount.textContent = `${allAdmins.length} Admins`;
    }

    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 3.5rem 2rem;">
            <div class="empty-state-wrap">
              <span class="empty-state-icon" style="display: block; margin-bottom: 0.5rem; color: var(--text-muted);">${icon('Search', 36)}</span>
              <h3 style="font-size: 1.1rem; color: var(--text-main); margin-bottom: 0.35rem;">No administrators found</h3>
              <p style="color: var(--text-muted); font-size: 0.88rem; max-width: 380px; margin: 0 auto;">
                ${allAdmins.length === 0 ? 'No administrator accounts loaded. Click "Add New Admin" to create one.' : 'No admin accounts match your search or role filter criteria.'}
              </p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered
      .map(adm => {
        const isPrimarySuper = adm.email.toLowerCase() === 'saicharanbhuthkuri468@gmail.com';
        const roleClass = getAdminRoleClass(adm.role);

        return `
        <tr data-admin-id="${adm.id}">
          <td>
            <div class="admin-user-cell">
              <div class="admin-shield-icon-badge ${roleClass}">${icon('Shield', 16)}</div>
              <div class="user-cell-meta">
                <div style="display: flex; align-items: center; gap: 0.4rem;">
                  <span class="user-cell-name">${escapeHtml(adm.name)}</span>
                  ${isPrimarySuper ? `<span class="master-crown-pill" title="Primary Master Account">${icon('Star', 11)} Primary Superadmin</span>` : ''}
                </div>
                <span class="user-cell-badge">ID: <code>${escapeHtml(adm.id)}</code></span>
              </div>
            </div>
          </td>
          <td class="admin-email-cell">
            <a href="mailto:${escapeHtml(adm.email)}" class="email-link">${escapeHtml(adm.email)}</a>
          </td>
          <td>
            <span class="admin-role-pill ${roleClass}">${escapeHtml(adm.role)}</span>
          </td>
          <td>
            <span class="security-level-tag">
              ${adm.role === 'SUPERADMIN' ? 'Full Cloud Access (R/W)' : 'Dashboard Operations'}
            </span>
          </td>
          <td class="admin-date-cell">${formatDate(adm.createdAt)}</td>
          <td style="text-align: right;">
            ${isPrimarySuper
            ? `<span class="protected-badge" title="Primary Superadmin account cannot be removed">${icon('Lock', 12)} Protected</span>`
            : `<button class="btn-action-delete btn-remove-admin" data-id="${adm.id}" data-name="${escapeHtml(adm.name)}" title="Remove administrator access">
                    ${icon('Trash2', 13)} Remove
                  </button>`
          }
          </td>
        </tr>
      `;
      })
      .join('');

    // Attach Remove Admin Listeners
    tbody.querySelectorAll<HTMLButtonElement>('.btn-remove-admin').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        if (!id) return;

        if (confirm(`Are you sure you want to revoke admin privileges and delete administrator "${name}"?`)) {
          soundEngine.playClick();
          btn.disabled = true;
          btn.textContent = 'Removing...';

          try {
            const res = await apiRemoveAdmin(id);
            if (res.success) {
              showToast(`Administrator ${name} removed.`, 'info');
              allAdmins = allAdmins.filter(a => a.id !== id);
              renderAdminsTable();
              updateBadgesAndMetrics();
            } else {
              showToast(res.error || 'Failed to remove admin.', 'warn');
              btn.disabled = false;
              btn.innerHTML = `${icon('Trash2', 13)} Remove`;
            }
          } catch (err) {
            console.error(err);
            showToast('Network error removing administrator.', 'warn');
            btn.disabled = false;
            btn.innerHTML = `${icon('Trash2', 13)} Remove`;
          }
        }
      });
    });
  }

  function openUserModal(user: AdminUserRecord) {
    soundEngine.playClick();
    if (!userModal || !modalContent || !modalUserName) return;

    modalUserName.textContent = user.name;
    modalContent.innerHTML = `
      <div class="user-modal-profile">
        ${renderAlphabetAvatar(user.name, 'modal-avatar')}
        <div class="modal-profile-text">
          <h3 class="modal-engineer-title">${escapeHtml(user.name)}</h3>
          <span class="modal-badge-title">${icon('Trophy', 14)} ${escapeHtml(user.badge || 'Engineer')}</span>
          <span class="modal-user-id">DB ID: <code>${escapeHtml(user.id)}</code></span>
        </div>
      </div>

      <div class="modal-info-grid">
        <div class="modal-info-item" style="grid-column: span 1;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
            <span class="info-label" style="margin-bottom: 0;">${icon('Mail', 13)} Email Address</span>
            <button class="btn-micro-copy" id="btn-quick-copy-email" title="Copy Email">
              ${icon('Copy', 11)} <span>Copy</span>
            </button>
          </div>
          <span class="info-value"><a href="mailto:${escapeHtml(user.email)}" class="email-link" title="${escapeHtml(user.email)}">${escapeHtml(user.email)}</a></span>
        </div>

        <div class="modal-info-item" style="grid-column: span 1;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
            <span class="info-label" style="margin-bottom: 0;">${icon('Phone', 13)} Mobile Number</span>
            <button class="btn-micro-copy" id="btn-quick-copy-mobile" title="Copy Mobile">
              ${icon('Copy', 11)} <span>Copy</span>
            </button>
          </div>
          <span class="info-value"><a href="tel:${escapeHtml(user.mobile)}" class="email-link" title="${escapeHtml(user.mobile || 'Not provided')}">${escapeHtml(user.mobile || 'Not provided')}</a></span>
        </div>

        <div class="modal-info-item">
          <span class="info-label">${icon('GraduationCap', 13)} Branch / Discipline</span>
          <span class="info-value">${escapeHtml(user.branch || 'General Engineering')}</span>
        </div>

        <div class="modal-info-item">
          <span class="info-label">${icon('Calendar', 13)} Year of Study</span>
          <span class="info-value">${escapeHtml(user.year || 'Standard')}</span>
        </div>

        <div class="modal-info-item">
          <span class="info-label">${icon('Flame', 13)} Day Streak</span>
          <span class="info-value"><strong style="color: #ea580c;">${user.streak || 0} Days Continuous</strong></span>
        </div>

        <div class="modal-info-item">
          <span class="info-label">${icon('Zap', 13)} Gamification XP</span>
          <span class="info-value"><strong style="color: var(--primary-color);">${(user.xp || 0).toLocaleString()} XP Points</strong></span>
        </div>

        <div class="modal-info-item" style="grid-column: 1 / -1; background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: var(--radius-md); padding: 0.85rem 1rem;">
          <span class="info-label" style="color: #475569; font-weight: 700; text-transform: uppercase; font-size: 0.72rem; letter-spacing: 0.05em; display: flex; align-items: center; gap: 0.35rem; margin-bottom: 0.35rem;">
            ${icon('Calendar', 13)} Account Registered
          </span>
          <span class="info-value" style="font-size: 0.95rem; font-weight: 600; color: #0f172a;">
            ${formatDate(user.createdAt)} <span style="font-size: 0.82rem; color: #64748b; font-weight: normal; margin-left: 0.5rem;">(${escapeHtml(user.createdAt || 'Direct Turso DB Record')})</span>
          </span>
        </div>
      </div>

      <div class="modal-actions-row">
        <button id="btn-copy-user-email" class="btn btn-secondary btn-pill">
          <span>${icon('Copy', 14)} Copy Email</span>
        </button>
        <button id="btn-modal-delete-user" class="btn btn-pill" style="background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5;">
          <span>${icon('Trash2', 14)} Delete Account</span>
        </button>
        <button id="btn-modal-done" class="btn btn-primary btn-pill">
          <span>Close</span>
        </button>
      </div>
    `;

    userModal.style.display = 'flex';

    modalContent.querySelector('#btn-copy-user-email')?.addEventListener('click', () => {
      navigator.clipboard.writeText(user.email);
      showToast(`Copied ${user.email} to clipboard!`, 'info');
    });

    modalContent.querySelector('#btn-quick-copy-email')?.addEventListener('click', () => {
      navigator.clipboard.writeText(user.email);
      showToast(`Copied ${user.email} to clipboard!`, 'info');
      const btn = modalContent.querySelector<HTMLButtonElement>('#btn-quick-copy-email');
      if (btn) {
        btn.innerHTML = `${icon('Check', 11)} <span>Copied!</span>`;
        btn.classList.add('copied');
        setTimeout(() => {
          btn.innerHTML = `${icon('Copy', 11)} <span>Copy</span>`;
          btn.classList.remove('copied');
        }, 1800);
      }
    });

    modalContent.querySelector('#btn-quick-copy-mobile')?.addEventListener('click', () => {
      if (user.mobile) {
        navigator.clipboard.writeText(user.mobile);
        showToast(`Copied ${user.mobile} to clipboard!`, 'info');
        const btn = modalContent.querySelector<HTMLButtonElement>('#btn-quick-copy-mobile');
        if (btn) {
          btn.innerHTML = `${icon('Check', 11)} <span>Copied!</span>`;
          btn.classList.add('copied');
          setTimeout(() => {
            btn.innerHTML = `${icon('Copy', 11)} <span>Copy</span>`;
            btn.classList.remove('copied');
          }, 1800);
        }
      } else {
        showToast('No mobile number provided for this user.', 'warn');
      }
    });

    modalContent.querySelector('#btn-modal-done')?.addEventListener('click', () => {
      userModal.style.display = 'none';
    });

    modalContent.querySelector('#btn-modal-delete-user')?.addEventListener('click', async () => {
      if (confirm(`Permanently delete ${user.name} from Turso DB?`)) {
        userModal.style.display = 'none';
        try {
          const res = await apiDeleteUser(user.id);
          if (res.success) {
            showToast(`User ${user.name} removed.`, 'info');
            allUsers = allUsers.filter(u => u.id !== user.id);
            filterAndRenderUsers();
            updateBadgesAndMetrics();
          }
        } catch (e) {
          console.error(e);
        }
      }
    });
  }

  function exportToCsv(users: AdminUserRecord[]) {
    if (users.length === 0) {
      showToast('No users to export.', 'warn');
      return;
    }
    const headers = ['ID', 'Name', 'Email', 'Mobile', 'Branch', 'Year', 'Streak', 'XP', 'Badge', 'Created_At'];
    const rows = users.map(u => [
      u.id,
      `"${u.name.replace(/"/g, '""')}"`,
      `"${u.email}"`,
      `"${u.mobile || ''}"`,
      `"${u.branch}"`,
      `"${u.year}"`,
      u.streak,
      u.xp,
      `"${u.badge}"`,
      `"${u.createdAt}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `engiverse_users_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast('Exported registered users to CSV', 'success');
  }

  function exportAdminsToCsv(admins: AdminRecord[]) {
    if (admins.length === 0) {
      showToast('No administrators to export.', 'warn');
      return;
    }
    const headers = ['Admin_ID', 'Name', 'Email', 'Role', 'Created_At'];
    const rows = admins.map(a => [
      a.id,
      `"${a.name.replace(/"/g, '""')}"`,
      `"${a.email}"`,
      `"${a.role}"`,
      `"${a.createdAt}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `engiverse_admins_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast('Exported administrators to CSV', 'success');
  }

  // =========================================================================
  // TAB 3: LIVE EVENTS & HOST CONSOLE CONTROLLER
  // =========================================================================

  const eventsSearchInput = container.querySelector<HTMLInputElement>('#events-search-input');
  const eventsFilterStatus = container.querySelector<HTMLSelectElement>('#events-filter-status');
  const eventsTbody = container.querySelector<HTMLElement>('#events-list-tbody');
  const eventsListSubview = container.querySelector<HTMLElement>('#events-list-subview');
  const eventsHostSubview = container.querySelector<HTMLElement>('#events-host-subview');

  const createEventModal = container.querySelector<HTMLElement>('#admin-create-event-modal');
  const btnCloseCreateEvent = container.querySelector<HTMLButtonElement>('#btn-close-create-event-modal');
  const btnCancelCreateEvent = container.querySelector<HTMLButtonElement>('#btn-cancel-create-event');
  const formCreateEvent = container.querySelector<HTMLFormElement>('#form-create-event');

  const questionsModal = container.querySelector<HTMLElement>('#admin-questions-modal');
  const btnCloseQuestionsModal = container.querySelector<HTMLButtonElement>('#btn-close-questions-modal');
  const modalQuestionsTbody = container.querySelector<HTMLElement>('#modal-questions-tbody');
  const modalQuestionsEventTitle = container.querySelector<HTMLElement>('#modal-questions-event-title');
  const formAddQuestion = container.querySelector<HTMLFormElement>('#form-add-question');

  const participantsModal = container.querySelector<HTMLElement>('#admin-participants-modal');
  const btnCloseParticipantsModal = container.querySelector<HTMLButtonElement>('#btn-close-participants-modal');
  const modalParticipantsTbody = container.querySelector<HTMLElement>('#modal-participants-tbody');
  const modalParticipantsEventTitle = container.querySelector<HTMLElement>('#modal-participants-event-title');

  // Search & Filter listeners
  eventsSearchInput?.addEventListener('input', () => filterAndRenderEvents());
  eventsFilterStatus?.addEventListener('change', () => filterAndRenderEvents());
  container.querySelector('#btn-events-refresh')?.addEventListener('click', () => {
    soundEngine.playClick();
    loadEventsData();
  });
  container.querySelector('#btn-events-refresh-top')?.addEventListener('click', () => {
    soundEngine.playClick();
    loadEventsData();
  });

  // Create Event Modal & Actions Helpers
  const openCreateEventModal = () => {
    soundEngine.playClick();
    if (createEventModal) {
      formCreateEvent?.reset();
      createEventModal.style.display = 'flex';
      container.querySelector<HTMLInputElement>('#new-event-title')?.focus();
    }
  };

  const hideCreateEventModal = () => {
    if (createEventModal) createEventModal.style.display = 'none';
  };

  // Wire all Add Event buttons across sidebar, headers, and module selectors
  [
    '#btn-open-create-event-modal',
    '#btn-modal-create-event',
    '#btn-reg-header-add-event',
    '#btn-part-header-add-event',
    '#btn-qm-header-add-event',
    '#btn-exam-header-add-event',
    '#btn-sb-header-add-event'
  ].forEach(selector => {
    container.querySelector(selector)?.addEventListener('click', openCreateEventModal);
  });

  btnCloseCreateEvent?.addEventListener('click', hideCreateEventModal);
  btnCancelCreateEvent?.addEventListener('click', hideCreateEventModal);
  createEventModal?.addEventListener('click', (e) => {
    if (e.target === createEventModal) hideCreateEventModal();
  });

  // All Events Directory Modal
  const allEventsModal = container.querySelector<HTMLElement>('#admin-all-events-modal');
  const btnCloseAllEventsModal = container.querySelector<HTMLButtonElement>('#btn-close-all-events-modal');
  const modalAllEventsTbody = container.querySelector<HTMLElement>('#modal-all-events-tbody');

  function openAllEventsModal() {
    soundEngine.playClick();
    if (allEventsModal) {
      allEventsModal.style.display = 'flex';
      renderAllEventsModalTable();
    }
  }

  function hideAllEventsModal() {
    if (allEventsModal) allEventsModal.style.display = 'none';
  }

  btnCloseAllEventsModal?.addEventListener('click', hideAllEventsModal);
  allEventsModal?.addEventListener('click', (e) => {
    if (e.target === allEventsModal) hideAllEventsModal();
  });

  // Wire Manage Events buttons
  container.querySelector('#btn-reg-header-manage-events')?.addEventListener('click', openAllEventsModal);

  function renderAllEventsModalTable() {
    if (!modalAllEventsTbody) return;
    if (allEvents.length === 0) {
      modalAllEventsTbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 3rem 2rem; color: var(--text-muted);">
            No competitive events found. Click "Add New Event" to create one.
          </td>
        </tr>
      `;
      return;
    }

    modalAllEventsTbody.innerHTML = allEvents.map(ev => {
      const isLive = ev.status === 'LIVE_NOW' || ev.status === 'LOBBY' || ev.status === 'QUESTION_ACTIVE';
      const statusBadge = isLive
        ? `<span class="event-status-chip live"><span class="pulse-dot"></span> LIVE NOW</span>`
        : ev.status === 'COMPLETED'
          ? `<span class="event-status-chip ended">COMPLETED</span>`
          : `<span class="event-status-chip upcoming">UPCOMING</span>`;

      return `
        <tr>
          <td>
            <strong style="color: var(--text-main); font-size: 0.92rem; display: block;">${escapeHtml(ev.title)}</strong>
            <span class="event-domain-tag" style="margin-top: 0.25rem;">${escapeHtml(ev.domain || 'Engineering')}</span>
          </td>
          <td>${statusBadge}</td>
          <td><span class="admin-event-reg-count">${ev.registrationCount || 0} Registered</span></td>
          <td><span style="font-weight: 600; color: var(--text-secondary);">${ev.questionCount || 0} Questions</span></td>
          <td style="text-align: right;">
            <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.4rem;">
              <button class="btn btn-pill-sm btn-modal-open-exam" data-id="${ev.id}" style="background: #4f46e5; color: #fff; font-size: 0.78rem; font-weight: 600; border: none; padding: 0.35rem 0.75rem;">
                ${icon('PlayCircle', 13)} Exam
              </button>
              <button class="btn btn-secondary btn-pill-sm btn-modal-open-qs" data-id="${ev.id}" style="font-size: 0.78rem; padding: 0.35rem 0.65rem;">
                ${icon('HelpCircle', 13)} Questions
              </button>
              <button class="btn btn-danger-soft btn-pill-sm btn-modal-delete-ev" data-id="${ev.id}" style="font-size: 0.78rem; padding: 0.35rem 0.65rem;" title="Permanently delete event">
                ${icon('Trash2', 13)} Remove
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    modalAllEventsTbody.querySelectorAll('.btn-modal-open-exam').forEach(b => {
      b.addEventListener('click', () => {
        soundEngine.playClick();
        const id = b.getAttribute('data-id');
        hideAllEventsModal();
        if (id) switchTab('event-exam', id);
      });
    });

    modalAllEventsTbody.querySelectorAll('.btn-modal-open-qs').forEach(b => {
      b.addEventListener('click', () => {
        soundEngine.playClick();
        const id = b.getAttribute('data-id');
        hideAllEventsModal();
        if (id) switchTab('event-questions', id);
      });
    });

    modalAllEventsTbody.querySelectorAll('.btn-modal-delete-ev').forEach(b => {
      b.addEventListener('click', () => {
        const id = b.getAttribute('data-id');
        if (id) promptDeleteEvent(id);
      });
    });
  }

  // Refresh All Event Selectors Across All Modules
  function refreshAllEventSelectors(targetEventId?: string) {
    const regSel = container.querySelector<HTMLSelectElement>('#reg-event-selector');
    const qmSel = container.querySelector<HTMLSelectElement>('#qm-event-selector');
    const examSel = container.querySelector<HTMLSelectElement>('#exam-event-selector');
    const sbSel = container.querySelector<HTMLSelectElement>('#sb-event-selector');
    const partSel = container.querySelector<HTMLSelectElement>('#part-filter-event');

    if (regSel) {
      regSel.innerHTML = `
        <option value="">-- Choose an Event to Register Users --</option>
        ${allEvents.map(e => `
          <option value="${e.id}" ${e.id === (targetEventId || regSelectedEventId) ? 'selected' : ''}>
            ${escapeHtml(e.title)} (${e.domain || 'Engineering'}) — ${e.registrationCount || 0} Registered
          </option>
        `).join('')}
      `;
    }

    if (qmSel) {
      qmSel.innerHTML = `
        <option value="">-- Choose an Event to Manage Questions --</option>
        ${allEvents.map(e => `
          <option value="${e.id}" ${e.id === (targetEventId || qmSelectedEventId) ? 'selected' : ''}>
            ${escapeHtml(e.title)} (${e.domain || 'Engineering'}) — ${e.questionCount || 0} Questions
          </option>
        `).join('')}
      `;
    }

    if (examSel) {
      examSel.innerHTML = `
        <option value="">-- Choose an Event to Broadcast &amp; Control --</option>
        ${allEvents.map(e => `
          <option value="${e.id}" ${e.id === (targetEventId || examSelectedEventId) ? 'selected' : ''}>
            ${escapeHtml(e.title)} (${e.domain || 'Engineering'}) — [${e.status}]
          </option>
        `).join('')}
      `;
    }

    if (sbSel) {
      sbSel.innerHTML = `
        <option value="">-- Choose an Event to View Scoreboard --</option>
        ${allEvents.map(e => `
          <option value="${e.id}" ${e.id === (targetEventId || sbSelectedEventId) ? 'selected' : ''}>
            ${escapeHtml(e.title)} (${e.domain || 'Engineering'}) — [${e.status}]
          </option>
        `).join('')}
      `;
    }

    if (partSel) {
      partSel.innerHTML = `
        <option value="ALL">All Competitive Events</option>
        ${allEvents.map(e => `
          <option value="${e.id}" ${e.id === (targetEventId || partSelectedEventId) ? 'selected' : ''}>
            ${escapeHtml(e.title)} (${e.registrationCount || 0} Registered)
          </option>
        `).join('')}
      `;
    }
  }

  // Delete Event with Confirmation
  async function promptDeleteEvent(eventId?: string) {
    soundEngine.playClick();
    if (!eventId) {
      showToast('Please select an event to remove.', 'warn');
      return;
    }
    const ev = allEvents.find(e => e.id === eventId);
    if (!ev) {
      showToast('Selected event not found.', 'warn');
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to permanently delete event:\n"${ev.title}"?\n\nWarning: This will delete all its questions, registrations, and leaderboard records from the database.`
    );
    if (!confirmed) return;

    try {
      showToast(`Deleting event "${ev.title}"...`, 'info');
      const res = await apiDeleteEvent(eventId);
      if (res.success) {
        soundEngine.playCorrect();
        showToast(`Event "${ev.title}" was permanently removed.`, 'info');
        allEvents = allEvents.filter(e => e.id !== eventId);
        const nextEventId = allEvents.length > 0 ? allEvents[0].id : '';

        // Reset tracking IDs
        if (regSelectedEventId === eventId) regSelectedEventId = nextEventId;
        if (qmSelectedEventId === eventId) qmSelectedEventId = nextEventId;
        if (examSelectedEventId === eventId) examSelectedEventId = nextEventId;
        if (sbSelectedEventId === eventId) sbSelectedEventId = nextEventId;
        if (partSelectedEventId === eventId) partSelectedEventId = 'ALL';

        refreshAllEventSelectors(nextEventId);

        // Re-render active module
        if (activeTab === 'event-register') {
          initEventRegisterModule(nextEventId);
        } else if (activeTab === 'event-questions') {
          initQuestionManagementModule(nextEventId);
        } else if (activeTab === 'event-exam') {
          initExamManagementModule(nextEventId);
        } else if (activeTab === 'event-scoreboard') {
          initEventScoreboardModule(nextEventId);
        } else if (activeTab === 'event-participants') {
          initEventParticipantsModule('ALL');
        } else if (activeTab === 'events') {
          filterAndRenderEvents();
        }

        renderAddEventPageRecent();
        renderRemoveEventsPageTable();

        if (allEventsModal && allEventsModal.style.display !== 'none') {
          renderAllEventsModalTable();
        }
      } else {
        showToast(res.message || 'Failed to delete event.', 'warn');
      }
    } catch (err) {
      console.error('Delete event error:', err);
      showToast('Failed to delete event from database.', 'warn');
    }
  }


  formCreateEvent?.addEventListener('submit', async (e) => {
    e.preventDefault();
    soundEngine.playClick();
    const titleInput = container.querySelector<HTMLInputElement>('#new-event-title');
    const descInput = container.querySelector<HTMLInputElement>('#new-event-desc');
    const domainInput = container.querySelector<HTMLSelectElement>('#new-event-domain');
    const timerInput = container.querySelector<HTMLInputElement>('#new-event-timer');
    const submitBtn = container.querySelector<HTMLButtonElement>('#btn-submit-create-event');

    const title = titleInput?.value.trim() || '';
    const description = descInput?.value.trim() || '';
    const domain = domainInput?.value || 'Engineering';
    const timerSeconds = Number(timerInput?.value || 30);

    if (!title) {
      showToast('Event title is required.', 'warn');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating Event...';
    }

    try {
      const res = await apiCreateEvent({ title, description, domain, timerSeconds });
      if (res.success && res.event) {
        soundEngine.playCorrect();
        showToast(`Event "${title}" created! Synchronized in real time.`, 'success');
        hideCreateEventModal();
        await loadEventsData();

        const createdId = res.event.id;
        regSelectedEventId = createdId;
        qmSelectedEventId = createdId;
        examSelectedEventId = createdId;
        sbSelectedEventId = createdId;
        partSelectedEventId = createdId;

        refreshAllEventSelectors(createdId);

        if (activeTab === 'event-register') {
          initEventRegisterModule(createdId);
        } else if (activeTab === 'event-questions') {
          initQuestionManagementModule(createdId);
        } else if (activeTab === 'event-exam') {
          initExamManagementModule(createdId);
        } else if (activeTab === 'event-scoreboard') {
          initEventScoreboardModule(createdId);
        } else if (activeTab === 'event-participants') {
          initEventParticipantsModule(createdId);
        } else if (activeTab === 'events') {
          filterAndRenderEvents();
        }

        if (allEventsModal && allEventsModal.style.display !== 'none') {
          renderAllEventsModalTable();
        }
      } else {
        showToast('Failed to create event.', 'warn');
      }
    } catch (err) {
      console.error(err);
      showToast('Error creating event.', 'warn');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create & Broadcast Event';
      }
    }
  });

  // Questions Modal Closures
  const hideQuestionsModal = () => {
    if (questionsModal) questionsModal.style.display = 'none';
    currentQuestionsModalEventId = null;
  };
  btnCloseQuestionsModal?.addEventListener('click', hideQuestionsModal);
  questionsModal?.addEventListener('click', (e) => {
    if (e.target === questionsModal) hideQuestionsModal();
  });

  // Participants Modal Closures
  const hideParticipantsModal = () => {
    if (participantsModal) participantsModal.style.display = 'none';
  };
  btnCloseParticipantsModal?.addEventListener('click', hideParticipantsModal);
  participantsModal?.addEventListener('click', (e) => {
    if (e.target === participantsModal) hideParticipantsModal();
  });

  // Add Event Dedicated Page Form Handler & Studio Logic
  const formAddEventPage = container.querySelector<HTMLFormElement>('#form-add-event-page');
  const pageTitleInput = container.querySelector<HTMLInputElement>('#page-event-title');
  const pageDescInput = container.querySelector<HTMLInputElement>('#page-event-desc');
  const pageDomainInput = container.querySelector<HTMLSelectElement>('#page-event-domain');
  const pageTimerInput = container.querySelector<HTMLInputElement>('#page-event-timer');

  const previewTitle = container.querySelector<HTMLElement>('#preview-event-title');
  const previewDesc = container.querySelector<HTMLElement>('#preview-event-desc');
  const previewDomain = container.querySelector<HTMLElement>('#preview-event-domain');
  const previewTimer = container.querySelector<HTMLElement>('#preview-event-timer');

  const syncLivePreview = () => {
    if (previewTitle) {
      const val = pageTitleInput?.value.trim();
      previewTitle.textContent = val || 'National Robotics & AI Championship 2026';
    }
    if (previewDesc) {
      const val = pageDescInput?.value.trim();
      previewDesc.textContent = val || 'Synchronized live engineering challenge across multi-round problem sets.';
    }
    if (previewDomain) {
      const selectedOption = pageDomainInput?.options[pageDomainInput.selectedIndex];
      previewDomain.textContent = selectedOption ? (selectedOption.textContent || pageDomainInput.value) : 'Computer Systems & AI';
    }
    if (previewTimer) {
      const val = pageTimerInput?.value || '30';
      previewTimer.textContent = `${val}s / Question`;
    }
  };

  pageTitleInput?.addEventListener('input', syncLivePreview);
  pageDescInput?.addEventListener('input', syncLivePreview);
  pageDomainInput?.addEventListener('change', syncLivePreview);
  pageTimerInput?.addEventListener('input', () => {
    syncLivePreview();
    const currentVal = pageTimerInput.value;
    container.querySelectorAll<HTMLButtonElement>('.timer-preset-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-seconds') === currentVal);
    });
  });

  // Timer Preset Buttons
  container.querySelectorAll<HTMLButtonElement>('.timer-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      soundEngine.playClick();
      const secs = btn.getAttribute('data-seconds');
      if (secs && pageTimerInput) {
        pageTimerInput.value = secs;
        container.querySelectorAll<HTMLButtonElement>('.timer-preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        syncLivePreview();
      }
    });
  });

  // Segmented Mode Switcher (Create Event vs Remove Events)
  const btnModeCreate = container.querySelector<HTMLButtonElement>('#btn-mode-create');
  const btnModeRemove = container.querySelector<HTMLButtonElement>('#btn-mode-remove');
  const subviewCreate = container.querySelector<HTMLElement>('#ops-subview-create');
  const subviewRemove = container.querySelector<HTMLElement>('#ops-subview-remove');

  btnModeCreate?.addEventListener('click', () => {
    soundEngine.playClick();
    btnModeCreate.classList.add('active');
    btnModeRemove?.classList.remove('active');
    if (subviewCreate) subviewCreate.style.display = 'grid';
    if (subviewRemove) subviewRemove.style.display = 'none';
  });

  btnModeRemove?.addEventListener('click', () => {
    soundEngine.playClick();
    btnModeRemove.classList.add('active');
    btnModeCreate?.classList.remove('active');
    if (subviewCreate) subviewCreate.style.display = 'none';
    if (subviewRemove) subviewRemove.style.display = 'block';
    renderRemoveEventsPageTable();
  });

  formAddEventPage?.addEventListener('reset', () => {
    setTimeout(() => {
      container.querySelectorAll<HTMLButtonElement>('.timer-preset-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-seconds') === '30');
      });
      syncLivePreview();
    }, 10);
  });

  formAddEventPage?.addEventListener('submit', async (e) => {
    e.preventDefault();
    soundEngine.playClick();
    const title = (pageTitleInput?.value || '').trim();
    const description = (pageDescInput?.value || '').trim();
    const domain = pageDomainInput?.value || 'Computer Systems';
    const timerSeconds = Number(pageTimerInput?.value || 30);
    const submitBtn = container.querySelector<HTMLButtonElement>('#btn-submit-page-add-event');

    if (!title) {
      showToast('Event title is required.', 'warn');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Publishing Event...';
    }

    try {
      const res = await apiCreateEvent({ title, description, domain, timerSeconds });
      if (res.success && res.event) {
        soundEngine.playCorrect();
        showToast(`Event "${title}" published & synchronized!`, 'success');
        formAddEventPage.reset();
        syncLivePreview();
        await loadEventsData();
        renderAddEventPageRecent();
      } else {
        showToast('Failed to create event.', 'warn');
      }
    } catch (err) {
      console.error(err);
      showToast('Error creating event.', 'warn');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>${icon('PlusCircle', 15)} Publish &amp; Broadcast Event</span>`;
      }
    }
  });

  function renderAddEventPageRecent() {
    const list = container.querySelector<HTMLElement>('#add-page-recent-events-list');
    const badge = container.querySelector<HTMLElement>('#add-page-events-count');
    const opsBadge = container.querySelector<HTMLElement>('#ops-events-badge');
    const removeBadge = container.querySelector<HTMLElement>('#badge-ops-remove-count');
    const metricTotal = container.querySelector<HTMLElement>('#metric-ops-total-events');
    const metricLive = container.querySelector<HTMLElement>('#metric-ops-live-events');
    const metricUsers = container.querySelector<HTMLElement>('#metric-ops-enrolled-users');
    const metricAvgTimer = container.querySelector<HTMLElement>('#metric-ops-avg-timer');

    const totalEvents = allEvents.length;
    if (badge) badge.textContent = `${totalEvents} Events`;
    if (opsBadge) opsBadge.textContent = `${totalEvents} Events Total`;
    if (removeBadge) removeBadge.textContent = totalEvents.toString();
    if (metricTotal) metricTotal.textContent = totalEvents.toString();

    const liveCount = allEvents.filter(e => e.status === 'LIVE_NOW' || e.status === 'LOBBY' || e.status === 'QUESTION_ACTIVE').length;
    if (metricLive) metricLive.textContent = liveCount.toString();

    const totalRegistered = allEvents.reduce((acc, ev) => acc + (ev.registrationCount || 0), 0);
    if (metricUsers) metricUsers.textContent = totalRegistered.toLocaleString();

    const totalSeconds = allEvents.reduce((acc, ev) => acc + (ev.timerSeconds || 30), 0);
    const avgTimer = totalEvents > 0 ? Math.round(totalSeconds / totalEvents) : 30;
    if (metricAvgTimer) metricAvgTimer.textContent = `${avgTimer}s`;

    if (!list) return;

    if (allEvents.length === 0) {
      list.innerHTML = `<span style="color: var(--text-muted); font-size: 0.85rem;">No events created yet. Use the form to launch your first event!</span>`;
      return;
    }

    list.innerHTML = allEvents.slice(0, 8).map(ev => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.65rem 0.85rem; background: #f8fafc; border-radius: var(--radius-md); border: 1px solid var(--border-card); transition: transform 0.15s ease;">
        <div style="display: flex; flex-direction: column; gap: 0.15rem; min-width: 0;">
          <strong style="font-size: 0.88rem; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 240px;">${escapeHtml(ev.title)}</strong>
          <span style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(ev.domain || 'Engineering')} &bull; ${ev.questionCount || 0} Qs &bull; ${ev.timerSeconds || 30}s</span>
        </div>
        <div style="display: flex; align-items: center; gap: 0.35rem;">
          <button class="btn btn-secondary btn-pill-sm btn-quick-open-exam" data-id="${ev.id}" style="font-size: 0.74rem; padding: 0.25rem 0.55rem;">
            ${icon('PlayCircle', 12)} Host
          </button>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.btn-quick-open-exam').forEach(b => {
      b.addEventListener('click', () => {
        soundEngine.playClick();
        const id = b.getAttribute('data-id');
        if (id) switchTab('event-exam', id);
      });
    });
  }

  // Remove Events Dedicated Page Handlers
  const removeSearchInput = container.querySelector<HTMLInputElement>('#remove-event-search-input');
  removeSearchInput?.addEventListener('input', () => renderRemoveEventsPageTable());
  container.querySelector('#btn-refresh-remove-list')?.addEventListener('click', () => {
    soundEngine.playClick();
    loadEventsData();
    renderRemoveEventsPageTable();
  });

  function renderRemoveEventsPageTable() {
    const tbody = container.querySelector<HTMLElement>('#remove-events-table-tbody');
    const footerCount = container.querySelector<HTMLElement>('#remove-events-footer-count');
    if (!tbody) return;

    const q = (removeSearchInput?.value || '').toLowerCase().trim();
    const filtered = allEvents.filter(ev =>
      ev.title.toLowerCase().includes(q) ||
      (ev.domain || '').toLowerCase().includes(q) ||
      (ev.description || '').toLowerCase().includes(q)
    );

    if (footerCount) {
      footerCount.textContent = `Showing ${filtered.length} of ${allEvents.length} events eligible for removal`;
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 3rem 2rem; color: var(--text-muted);">
            No competitive events found matching "${escapeHtml(q)}".
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(ev => {
      const isLive = ev.status === 'LIVE_NOW' || ev.status === 'LOBBY' || ev.status === 'QUESTION_ACTIVE';
      const statusBadge = isLive
        ? `<span class="event-status-chip live"><span class="pulse-dot"></span> LIVE NOW</span>`
        : ev.status === 'COMPLETED'
          ? `<span class="event-status-chip ended">COMPLETED</span>`
          : `<span class="event-status-chip upcoming">UPCOMING</span>`;

      return `
        <tr>
          <td>
            <strong style="color: var(--text-main); font-size: 0.92rem; display: block;">${escapeHtml(ev.title)}</strong>
            <span class="event-domain-tag" style="margin-top: 0.25rem;">${escapeHtml(ev.domain || 'Engineering')}</span>
          </td>
          <td>${statusBadge}</td>
          <td><span class="admin-event-reg-count">${ev.registrationCount || 0} Registered</span></td>
          <td><span style="font-weight: 600; color: var(--text-secondary);">${ev.questionCount || 0} Questions</span></td>
          <td><span style="font-weight: 600; color: var(--text-muted);">${ev.timerSeconds || 30}s</span></td>
          <td style="text-align: right;">
            <button class="btn btn-danger-soft btn-pill-sm btn-action-delete-single-ev" data-id="${ev.id}" style="font-size: 0.78rem; padding: 0.38rem 0.75rem;" title="Permanently remove event">
              ${icon('Trash2', 13)} <span>Remove Event</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.btn-action-delete-single-ev').forEach(b => {
      b.addEventListener('click', () => {
        const id = b.getAttribute('data-id');
        if (id) promptDeleteEvent(id);
      });
    });
  }

  // Load Events Data
  async function loadEventsData() {
    try {
      const res = await apiGetEvents();
      if (res.success) {
        allEvents = res.events;
        const badgeEvents = container.querySelector('#badge-events-count');
        if (badgeEvents) badgeEvents.textContent = allEvents.length.toString();
        filterAndRenderEvents();
        refreshAllEventSelectors();
        renderAddEventPageRecent();
        renderRemoveEventsPageTable();
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    }
  }

  // Filter and Render Events Table
  function filterAndRenderEvents() {
    if (!eventsTbody) return;
    const q = (eventsSearchInput?.value || '').toLowerCase().trim();
    const st = eventsFilterStatus?.value || 'ALL';

    const filtered = allEvents.filter(ev => {
      const matchQ = ev.title.toLowerCase().includes(q) ||
        (ev.domain || '').toLowerCase().includes(q) ||
        (ev.description || '').toLowerCase().includes(q);
      const matchSt = st === 'ALL' || ev.status === st;
      return matchQ && matchSt;
    });

    if (filtered.length === 0) {
      eventsTbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 4rem 2rem;">
            <span style="color: var(--text-muted); display: block; margin-bottom: 0.5rem;">${icon('Calendar', 36)}</span>
            <h4 style="font-size: 1.05rem; color: var(--text-main); margin-bottom: 0.25rem;">No Events Found</h4>
            <p style="color: var(--text-muted); font-size: 0.85rem;">Try adjusting your search criteria or create a new live event.</p>
          </td>
        </tr>
      `;
      const countLabel = container.querySelector('#events-table-count-label');
      if (countLabel) countLabel.textContent = `Showing 0 of ${allEvents.length} events`;
      return;
    }

    const countLabel = container.querySelector('#events-table-count-label');
    if (countLabel) {
      countLabel.textContent = `Showing ${filtered.length} of ${allEvents.length} synchronized live events`;
    }

    eventsTbody.innerHTML = filtered.map(ev => {
      const isLive = ev.status === 'LIVE_NOW' || ev.status === 'LOBBY' || ev.status === 'QUESTION_ACTIVE';
      const statusBadge = isLive
        ? `<span class="event-status-chip live"><span class="pulse-dot"></span> LIVE NOW</span>`
        : ev.status === 'COMPLETED'
          ? `<span class="event-status-chip ended">COMPLETED</span>`
          : `<span class="event-status-chip upcoming">UPCOMING</span>`;

      return `
        <tr>
          <td>
            <div style="display: flex; flex-direction: column; gap: 0.25rem;">
              <strong style="color: var(--text-main); font-size: 0.95rem; font-weight: 700;">${escapeHtml(ev.title)}</strong>
              <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <span class="event-domain-tag">${escapeHtml(ev.domain || 'Engineering')}</span>
                <span style="font-size: 0.78rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 320px;">${escapeHtml(ev.description || '')}</span>
              </div>
            </div>
          </td>
          <td>${statusBadge}</td>
          <td>
            <span class="admin-event-reg-count">${ev.registrationCount || 0} Registered</span>
          </td>
          <td>
            <span style="font-weight: 600; color: var(--text-secondary);">${ev.questionCount || 0} Questions</span>
          </td>
          <td>
            <span style="font-weight: 600; color: var(--text-muted);">${ev.timerSeconds || 30}s</span>
          </td>
          <td style="text-align: right;">
            <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.45rem;">
              <button class="btn btn-pill btn-host-event" data-id="${ev.id}" style="background: ${isLive ? 'linear-gradient(135deg, #16a34a, #22c55e)' : 'linear-gradient(135deg, #4f46e5, #6366f1)'}; color: #ffffff; border: none; font-weight: 700; font-size: 0.78rem; padding: 0.45rem 0.9rem;">
                <span>${icon('Trophy', 13)} Host Console</span>
              </button>
              <button class="btn btn-secondary btn-pill btn-manage-qs" data-id="${ev.id}" style="font-size: 0.78rem; padding: 0.45rem 0.75rem;" title="Manage Questions">
                <span>${icon('HelpCircle', 13)} Questions</span>
              </button>
              <button class="btn btn-secondary btn-icon-round btn-view-participants" data-id="${ev.id}" title="View Registered Participants">
                <span>${icon('Users', 13)}</span>
              </button>
              <button class="btn btn-icon-round btn-danger-soft btn-delete-event" data-id="${ev.id}" title="Delete Event">
                <span>${icon('Trash2', 13)}</span>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Attach row button listeners
    eventsTbody.querySelectorAll('.btn-host-event').forEach(b => {
      b.addEventListener('click', () => {
        soundEngine.playClick();
        const id = b.getAttribute('data-id');
        if (id) switchTab('event-exam', id);
      });
    });

    eventsTbody.querySelectorAll('.btn-manage-qs').forEach(b => {
      b.addEventListener('click', () => {
        soundEngine.playClick();
        const id = b.getAttribute('data-id');
        if (id) switchTab('event-questions', id);
      });
    });

    eventsTbody.querySelectorAll('.btn-view-participants').forEach(b => {
      b.addEventListener('click', () => {
        soundEngine.playClick();
        const id = b.getAttribute('data-id');
        if (id) switchTab('event-participants', id);
      });
    });

    eventsTbody.querySelectorAll('.btn-delete-event').forEach(b => {
      b.addEventListener('click', async () => {
        soundEngine.playClick();
        const id = b.getAttribute('data-id');
        if (!id) return;
        if (!confirm('Are you sure you want to permanently delete this competitive event?')) return;
        try {
          const res = await apiDeleteEvent(id);
          if (res.success) {
            soundEngine.playCorrect();
            showToast('Event deleted successfully.', 'info');
            allEvents = allEvents.filter(e => e.id !== id);
            filterAndRenderEvents();
          }
        } catch (err) {
          console.error(err);
          showToast('Failed to delete event.', 'warn');
        }
      });
    });
  }

  // Open Questions Modal
  let modalQuestionsCurrentMode: 'add' | 'list' = 'add';

  function setQuestionsModalMode(mode: 'add' | 'list') {
    modalQuestionsCurrentMode = mode;
    const subviewAdd = container.querySelector<HTMLElement>('#modal-subview-add-question');
    const subviewList = container.querySelector<HTMLElement>('#modal-subview-list-questions');
    const badgeChip = container.querySelector<HTMLElement>('#modal-questions-badge-chip');
    const toggleBtnLabel = container.querySelector<HTMLElement>('#label-modal-toggle-view');

    if (mode === 'add') {
      if (subviewAdd) subviewAdd.style.display = 'block';
      if (subviewList) subviewList.style.display = 'none';
      if (badgeChip) badgeChip.innerHTML = `${icon('PlusCircle', 14)} ADD NEW QUESTION`;
      if (toggleBtnLabel) toggleBtnLabel.textContent = 'View Questions List';
      setTimeout(() => {
        container.querySelector<HTMLInputElement | HTMLTextAreaElement>('#new-q-text')?.focus();
      }, 30);
    } else {
      if (subviewAdd) subviewAdd.style.display = 'none';
      if (subviewList) subviewList.style.display = 'block';
      if (badgeChip) badgeChip.innerHTML = `${icon('List', 14)} QUESTIONS LIST`;
      if (toggleBtnLabel) toggleBtnLabel.textContent = 'Add New Question';
      if (currentQuestionsModalEventId) {
        reloadModalQuestions(currentQuestionsModalEventId);
      }
    }
  }

  // Toggle button between Add Question and View List
  container.querySelector<HTMLButtonElement>('#btn-modal-toggle-view')?.addEventListener('click', () => {
    soundEngine.playClick();
    setQuestionsModalMode(modalQuestionsCurrentMode === 'add' ? 'list' : 'add');
  });

  // Switch back to Add view from within List view
  container.querySelector<HTMLButtonElement>('#btn-modal-switch-to-add')?.addEventListener('click', () => {
    soundEngine.playClick();
    setQuestionsModalMode('add');
  });

  async function openQuestionsModal(eventId: string, initialMode: 'add' | 'list' = 'add') {
    currentQuestionsModalEventId = eventId;
    const ev = allEvents.find(e => e.id === eventId);
    if (modalQuestionsEventTitle) {
      modalQuestionsEventTitle.textContent = ev ? `Questions: ${ev.title}` : 'Event Questions';
    }

    setQuestionsModalMode(initialMode);

    // Reset form to completely empty state
    formAddQuestion?.reset();
    const timerInput = container.querySelector<HTMLInputElement>('#new-q-timer');
    if (timerInput) timerInput.value = String(ev?.timerSeconds || 30);
    const pointsInput = container.querySelector<HTMLInputElement>('#new-q-points');
    if (pointsInput) pointsInput.value = '100';

    if (questionsModal) questionsModal.style.display = 'flex';
    setTimeout(() => {
      container.querySelector<HTMLInputElement | HTMLTextAreaElement>('#new-q-text')?.focus();
    }, 50);
  }

  async function reloadModalQuestions(eventId: string) {
    if (!modalQuestionsTbody) return;
    modalQuestionsTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:2rem;"><div class="admin-loading-spinner"></div></td></tr>`;
    try {
      const res = await apiGetEventQuestions(eventId, 'admin');
      if (res.success) {
        const questions = res.questions;
        const countSummary = container.querySelector<HTMLElement>('#modal-questions-count-summary');
        if (countSummary) countSummary.textContent = `Existing Questions (${questions.length} Total)`;

        if (questions.length === 0) {
          modalQuestionsTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--text-muted);">No questions added yet. Click "Add Another Question" above to create one.</td></tr>`;
          return;
        }

        modalQuestionsTbody.innerHTML = questions.map((q, idx) => `
          <tr>
            <td style="font-weight: 700; color: #4338ca;">${idx + 1}</td>
            <td>
              <div style="display: flex; flex-direction: column; gap: 0.15rem;">
                <span style="font-weight: 600; color: var(--text-main);">${escapeHtml(q.questionText)}</span>
                <span style="font-size: 0.75rem; color: var(--text-muted);">${q.options.map((opt, i) => `${String.fromCharCode(65 + i)}: ${escapeHtml(opt)}`).join(' | ')}</span>
              </div>
            </td>
            <td>
              <span class="event-status-chip live" style="font-size: 0.72rem; padding: 0.2rem 0.5rem;">
                Option ${String.fromCharCode(65 + (q.correctOption ?? 0))}
              </span>
            </td>
            <td><span style="font-size: 0.82rem; color: var(--text-muted);">${q.timerSeconds || 30}s</span></td>
            <td style="text-align: right;">
              <button class="btn btn-pill btn-delete-q" data-id="${q.id}" style="background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; font-size: 0.75rem; padding: 0.25rem 0.5rem;" title="Delete question">
                ${icon('Trash2', 12)}
              </button>
            </td>
          </tr>
        `).join('');

        modalQuestionsTbody.querySelectorAll('.btn-delete-q').forEach(btn => {
          btn.addEventListener('click', async () => {
            soundEngine.playClick();
            const qId = btn.getAttribute('data-id');
            if (!qId || !currentQuestionsModalEventId) return;
            try {
              const delRes = await apiDeleteEventQuestion(currentQuestionsModalEventId, qId);
              if (delRes.success) {
                showToast('Question deleted.', 'info');
                await reloadModalQuestions(currentQuestionsModalEventId);
                await loadEventsData();
                if (activeTab === 'event-questions') {
                  initQuestionManagementModule(currentQuestionsModalEventId);
                }
              }
            } catch (err) {
              console.error(err);
              showToast('Failed to delete question.', 'warn');
            }
          });
        });
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Add Question form submission: Saves to DB, resets form, and keeps empty form without loading previous questions
  formAddQuestion?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentQuestionsModalEventId) return;
    soundEngine.playClick();

    const qText = container.querySelector<HTMLInputElement | HTMLTextAreaElement>('#new-q-text')?.value.trim() || '';
    const opt0 = container.querySelector<HTMLInputElement>('#new-q-opt-0')?.value.trim() || '';
    const opt1 = container.querySelector<HTMLInputElement>('#new-q-opt-1')?.value.trim() || '';
    const opt2 = container.querySelector<HTMLInputElement>('#new-q-opt-2')?.value.trim() || '';
    const opt3 = container.querySelector<HTMLInputElement>('#new-q-opt-3')?.value.trim() || '';
    const correct = Number(container.querySelector<HTMLSelectElement>('#new-q-correct')?.value || 0);
    const timer = Number(container.querySelector<HTMLInputElement>('#new-q-timer')?.value || 30);
    const points = Number(container.querySelector<HTMLInputElement>('#new-q-points')?.value || 100);
    const expl = container.querySelector<HTMLInputElement>('#new-q-explanation')?.value.trim() || '';
    const submitBtn = container.querySelector<HTMLButtonElement>('#btn-submit-add-question');

    if (!qText || !opt0 || !opt1) {
      showToast('Question text and at least options A and B are required.', 'warn');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving Question...';
    }

    try {
      const res = await apiAddEventQuestion(currentQuestionsModalEventId, {
        questionText: qText,
        options: [opt0, opt1, opt2, opt3].filter(Boolean),
        correctOption: correct,
        explanation: expl,
        timerSeconds: timer,
        points: points
      });

      if (res.success) {
        soundEngine.playCorrect();
        showToast('Question saved! Ready for next question.', 'success');

        // Reset form for entering another question
        formAddQuestion.reset();
        const ev = allEvents.find(eventItem => eventItem.id === currentQuestionsModalEventId);
        const timerInput = container.querySelector<HTMLInputElement>('#new-q-timer');
        if (timerInput) timerInput.value = String(ev?.timerSeconds || 30);
        const pointsInput = container.querySelector<HTMLInputElement>('#new-q-points');
        if (pointsInput) pointsInput.value = '100';

        // Keep empty form focused without showing previously added questions
        const qTextInput = container.querySelector<HTMLInputElement | HTMLTextAreaElement>('#new-q-text');
        if (qTextInput) qTextInput.focus();

        // Update events data in background
        loadEventsData();
        if (activeTab === 'event-questions') {
          initQuestionManagementModule(currentQuestionsModalEventId);
        }
      } else {
        showToast(res.message || 'Failed to add question.', 'warn');
      }
    } catch (err) {
      console.error(err);
      showToast('Error adding question.', 'warn');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>${icon('PlusCircle', 15)} Add Question</span>`;
      }
    }
  });

  // Open Participants Modal
  async function openParticipantsModal(eventId: string) {
    const ev = allEvents.find(e => e.id === eventId);
    if (modalParticipantsEventTitle) {
      modalParticipantsEventTitle.textContent = ev ? `Participants: ${ev.title}` : 'Event Participants';
    }
    if (modalParticipantsTbody) {
      modalParticipantsTbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:2rem;"><div class="admin-loading-spinner"></div></td></tr>`;
    }
    if (participantsModal) participantsModal.style.display = 'flex';

    try {
      const res = await apiGetEventParticipants(eventId);
      if (res.success && modalParticipantsTbody) {
        if (res.participants.length === 0) {
          modalParticipantsTbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:2rem; color:var(--text-muted);">No participants have registered for this event yet.</td></tr>`;
          return;
        }

        modalParticipantsTbody.innerHTML = res.participants.map((p: EventParticipant, idx: number) => `
          <tr>
            <td style="font-weight: 700; color: #4338ca;">${idx + 1}</td>
            <td>
              <div style="display: flex; align-items: center; gap: 0.6rem;">
                ${renderAlphabetAvatar(p.userName, 'table-avatar-sm')}
                <div style="display: flex; flex-direction: column;">
                  <strong style="color: var(--text-main); font-size: 0.9rem;">${escapeHtml(p.userName)}</strong>
                  <span style="font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(p.userEmail)}</span>
                </div>
              </div>
            </td>
            <td>
              <span style="font-size: 0.85rem; color: var(--text-secondary);">${formatDate(p.registeredAt)}</span>
            </td>
          </tr>
        `).join('');
      }
    } catch (err) {
      console.error(err);
    }
  }

  // =========================================================================
  // LIVE HOST CONSOLE CONTROLLER (Synchronized real-time quiz master)
  // =========================================================================

  let hostUnsubs: (() => void)[] = [];

  async function openHostConsole(eventId: string) {
    activeHostEvent = allEvents.find(e => e.id === eventId) || null;
    if (!activeHostEvent) return;

    if (eventsListSubview) eventsListSubview.style.display = 'none';
    if (eventsHostSubview) eventsHostSubview.style.display = 'block';

    // Clear previous unsubs
    hostUnsubs.forEach(u => u());
    hostUnsubs = [];

    // Connect & Join WebSocket room
    wsClient.connect();
    wsClient.joinEventRoom(eventId);

    // Fetch initial questions and leaderboard
    try {
      const [qRes, leadRes] = await Promise.all([
        apiGetEventQuestions(eventId, 'admin'),
        apiGetEventLeaderboard(eventId)
      ]);
      if (qRes.success) hostQuestions = qRes.questions;
      if (leadRes.success) hostLeaderboard = leadRes.leaderboard;
    } catch (err) {
      console.error(err);
    }

    renderHostConsoleBody();
    attachHostWebSocketListeners(eventId);
  }

  function closeHostConsole() {
    hostUnsubs.forEach(u => u());
    hostUnsubs = [];
    if (activeHostEvent) {
      wsClient.leaveEventRoom(activeHostEvent.id);
    }
    activeHostEvent = null;
    if (eventsHostSubview) eventsHostSubview.style.display = 'none';
    if (eventsListSubview) eventsListSubview.style.display = 'block';
    loadEventsData();
  }

  function renderHostConsoleBody() {
    if (!eventsHostSubview || !activeHostEvent) return;

    const totalQs = hostQuestions.length;
    const nextQIdx = hostCurrentQuestionIdx + 1;
    const isQuestionActive = hostEventStatus === 'QUESTION_ACTIVE';
    const isLobby = hostEventStatus === 'LOBBY' || hostEventStatus === 'EVENT_STARTED_WAITING_QUESTION' || hostEventStatus === 'QUESTION_ENDED';
    const isUpcoming = hostEventStatus === 'UPCOMING';
    const isEnded = hostEventStatus === 'EVENT_ENDED' || hostEventStatus === 'COMPLETED';

    eventsHostSubview.innerHTML = `
      <!-- Host Header Banner -->
      <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); border-radius: 20px; padding: 1.75rem 2rem; color: #ffffff; margin-bottom: 1.5rem; border: 1px solid #4338ca; box-shadow: 0 10px 25px -5px rgba(30, 27, 75, 0.4);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.25rem;">
          <button id="btn-host-exit" class="btn btn-secondary btn-pill" style="background: rgba(255, 255, 255, 0.1); color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.2);">
            <span>${icon('ArrowLeft', 14)} Exit Host Console</span>
          </button>
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            <div class="portal-stat-pill" style="border-color: #86efac; background: rgba(34, 197, 94, 0.15); color: #4ade80;">
              <span class="pulse-dot"></span>
              <span style="font-weight: 700; font-size: 0.78rem;">Live Sync Active</span>
            </div>
            <span class="event-status-chip ${isQuestionActive || isLobby ? 'live' : isEnded ? 'ended' : 'upcoming'}">
              ${hostEventStatus}
            </span>
          </div>
        </div>

        <div style="display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
          <div>
            <span style="font-size: 0.75rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #a5b4fc;">
              ${escapeHtml(activeHostEvent.domain || 'Engineering')} • REAL-TIME HOST CONSOLE
            </span>
            <h2 style="font-size: 1.75rem; font-weight: 900; margin: 0.35rem 0 0.25rem; color: #ffffff; letter-spacing: -0.02em;">
              ${escapeHtml(activeHostEvent.title)}
            </h2>
            <p style="margin: 0; font-size: 0.9rem; color: #c7d2fe;">
              ${escapeHtml(activeHostEvent.description || 'Live multiplayer competition')}
            </p>
          </div>

          <div style="display: flex; align-items: center; gap: 1.5rem; background: rgba(255, 255, 255, 0.08); padding: 0.75rem 1.25rem; border-radius: 14px; border: 1px solid rgba(255, 255, 255, 0.15);">
            <div>
              <span style="font-size: 0.72rem; color: #a5b4fc; text-transform: uppercase; font-weight: 700; display: block;">Registered</span>
              <strong style="font-size: 1.25rem; color: #ffffff;">${activeHostEvent.registrationCount || 0}</strong>
            </div>
            <div style="border-left: 1px solid rgba(255, 255, 255, 0.2); padding-left: 1.5rem;">
              <span style="font-size: 0.72rem; color: #a5b4fc; text-transform: uppercase; font-weight: 700; display: block;">Questions</span>
              <strong style="font-size: 1.25rem; color: #ffffff;">${totalQs}</strong>
            </div>
            <div style="border-left: 1px solid rgba(255, 255, 255, 0.2); padding-left: 1.5rem;">
              <span style="font-size: 0.72rem; color: #a5b4fc; text-transform: uppercase; font-weight: 700; display: block;">Current Step</span>
              <strong style="font-size: 1.25rem; color: #ffffff;">
                ${hostCurrentQuestionIdx >= 0 ? `Q${hostCurrentQuestionIdx + 1} / ${totalQs}` : 'Lobby'}
              </strong>
            </div>
          </div>
        </div>
      </div>

      <!-- Host Action Deck (Controls Question Flow) -->
      <div class="admin-card" style="padding: 1.5rem; margin-bottom: 1.5rem; border: 1.5px solid var(--border-card); border-radius: 20px;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h3 style="font-size: 1.1rem; font-weight: 800; margin: 0 0 0.25rem; color: var(--text-main);">
              Event Flow Controller
            </h3>
            <p style="margin: 0; font-size: 0.85rem; color: var(--text-secondary);">
              Server controls the synchronized event state. Actions broadcast immediately to all registered participant browsers.
            </p>
          </div>

          <div style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap;">
            ${isUpcoming ? `
              <button id="btn-host-start-event" class="btn btn-primary btn-pill" style="background: linear-gradient(135deg, #16a34a, #22c55e); font-size: 0.92rem; padding: 0.75rem 1.5rem;">
                <span>${icon('Play', 15)} Start Event (Broadcast EVENT_STARTED)</span>
              </button>
            ` : ''}

            ${(isLobby && nextQIdx < totalQs) ? `
              <button id="btn-host-send-question" class="btn btn-primary btn-pill" style="background: linear-gradient(135deg, #4f46e5, #6366f1); font-size: 0.92rem; padding: 0.75rem 1.5rem;">
                <span>${icon('Send', 15)} Send Question ${nextQIdx + 1} to All Participants</span>
              </button>
            ` : ''}

            ${isQuestionActive ? `
              <div style="display: flex; align-items: center; gap: 0.5rem; background: #fef2f2; border: 1.5px solid #fecaca; padding: 0.45rem 0.85rem; border-radius: var(--radius-full);">
                <span class="pulse-dot" style="background: #ef4444;"></span>
                <span style="font-weight: 800; color: #dc2626; font-size: 0.88rem;" id="host-timer-display">${hostRemainingSeconds}s Remaining</span>
              </div>
              <button id="btn-host-next-question" class="btn btn-secondary btn-pill" style="font-size: 0.88rem; padding: 0.65rem 1.25rem;">
                <span>${icon('SkipForward', 14)} Next Question / End Timer Early</span>
              </button>
            ` : ''}

            ${!isEnded ? `
              <button id="btn-host-end-event" class="btn btn-pill" style="background: #fee2e2; color: #dc2626; border: 1.5px solid #fca5a5; font-size: 0.88rem; padding: 0.65rem 1.25rem;">
                <span>${icon('StopCircle', 14)} End Event &amp; Finalize</span>
              </button>
            ` : ''}
          </div>
        </div>

        ${hostCurrentQuestion ? `
          <div style="margin-top: 1.25rem; padding: 1.25rem; background: #f8fafc; border-radius: 14px; border: 1px solid var(--border-card);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
              <span style="font-size: 0.78rem; font-weight: 800; color: #4338ca; text-transform: uppercase;">
                Question ${hostCurrentQuestionIdx + 1} Preview
              </span>
              <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">
                ${hostQuestionAnswerCount} Answers Received
              </span>
            </div>
            <h4 style="font-size: 1.05rem; font-weight: 700; color: var(--text-main); margin: 0 0 0.85rem;">
              ${escapeHtml(hostCurrentQuestion.questionText)}
            </h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.5rem;">
              ${hostCurrentQuestion.options.map((opt: string, i: number) => {
      const isCorrect = i === hostCurrentQuestion?.correctOption;
      return `
                  <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; border-radius: 8px; font-size: 0.85rem; background: ${isCorrect ? '#dcfce7' : '#ffffff'}; border: 1px solid ${isCorrect ? '#86efac' : 'var(--border-card)'}; color: ${isCorrect ? '#15803d' : 'var(--text-main)'}; font-weight: ${isCorrect ? '700' : '500'};">
                    <span style="font-weight: 800;">${String.fromCharCode(65 + i)}:</span>
                    <span>${escapeHtml(opt)}</span>
                    ${isCorrect ? `<span style="margin-left: auto;">${icon('Check', 12)}</span>` : ''}
                  </div>
                `;
    }).join('')}
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Admin Live Scoreboard (The Exact Table Required) -->
      <div class="admin-card table-card">
        <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-card); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            <span style="color: #7c3aed;">${icon('Award', 20)}</span>
            <h3 style="font-size: 1.15rem; font-weight: 800; margin: 0; color: var(--text-main);">
              Live Scoreboard
            </h3>
            <span class="portal-stat-pill" style="border-color: #86efac; background: #f0fdf4; color: #16a34a; font-size: 0.72rem; padding: 0.2rem 0.55rem;">
              <span class="pulse-dot"></span> Live Real-Time Sync
            </span>
          </div>
          <span style="font-size: 0.82rem; color: var(--text-muted); font-weight: 600;" id="host-lead-count">
            ${hostLeaderboard.length} Participants Ranked
          </span>
        </div>

        <div class="admin-table-container">
          <table class="admin-lead-table">
            <thead>
              <tr>
                <th style="width: 12%;">Rank</th>
                <th style="width: 40%;">Participant</th>
                <th style="width: 16%; text-align: right;">Score</th>
                <th style="width: 16%; text-align: right;">Correct</th>
                <th style="width: 16%; text-align: right;">Time</th>
              </tr>
            </thead>
            <tbody id="host-scoreboard-tbody">
              ${renderHostScoreboardRows()}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Attach button listeners
    container.querySelector('#btn-host-exit')?.addEventListener('click', () => {
      soundEngine.playClick();
      closeHostConsole();
    });

    container.querySelector('#btn-host-start-event')?.addEventListener('click', () => {
      soundEngine.playClick();
      if (!activeHostEvent) return;
      wsClient.send('ADMIN_START_EVENT', { eventId: activeHostEvent.id });
      showToast('Event started! Server broadcasted EVENT_STARTED.', 'success');
      hostEventStatus = 'LOBBY';
      renderHostConsoleBody();
    });

    container.querySelector('#btn-host-send-question')?.addEventListener('click', () => {
      soundEngine.playClick();
      if (!activeHostEvent) return;
      wsClient.send('ADMIN_SEND_QUESTION', {
        eventId: activeHostEvent.id,
        questionIndex: nextQIdx
      });
      showToast(`Question ${nextQIdx + 1} sent to all registered participants!`, 'info');
      hostCurrentQuestionIdx = nextQIdx;
      hostCurrentQuestion = hostQuestions[nextQIdx] || null;
      hostEventStatus = 'QUESTION_ACTIVE';
      hostQuestionAnswerCount = 0;
      renderHostConsoleBody();
    });

    container.querySelector('#btn-host-next-question')?.addEventListener('click', () => {
      soundEngine.playClick();
      if (!activeHostEvent) return;
      wsClient.send('ADMIN_NEXT_QUESTION', { eventId: activeHostEvent.id });
      showToast('Advancing question flow...', 'info');
    });

    container.querySelector('#btn-host-end-event')?.addEventListener('click', () => {
      soundEngine.playClick();
      if (!activeHostEvent) return;
      if (!confirm('Are you sure you want to end this event and finalize the leaderboard?')) return;
      wsClient.send('ADMIN_END_EVENT', { eventId: activeHostEvent.id });
      showToast('Event ended! Final leaderboard broadcasted.', 'success');
      hostEventStatus = 'EVENT_ENDED';
      renderHostConsoleBody();
    });
  }

  function renderHostScoreboardRows(): string {
    if (hostLeaderboard.length === 0) {
      return `
        <tr>
          <td colspan="5" style="text-align: center; padding: 3rem 2rem; color: var(--text-muted);">
            <span>No participants have submitted answers yet. Rankings will appear here live in real time.</span>
          </td>
        </tr>
      `;
    }

    return hostLeaderboard.map(entry => `
      <tr>
        <td>
          <span class="lead-rank-badge ${entry.rank === 1 ? 'lead-rank-1' : entry.rank === 2 ? 'lead-rank-2' : entry.rank === 3 ? 'lead-rank-3' : ''}">
            ${entry.rank}
          </span>
        </td>
        <td>
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            ${renderAlphabetAvatar(entry.userName, 'table-avatar-sm')}
            <strong style="color: var(--text-main); font-size: 0.9rem;">${escapeHtml(entry.userName)}</strong>
          </div>
        </td>
        <td style="text-align: right; font-weight: 800; color: #4338ca; font-size: 0.95rem;">
          ${entry.score}
        </td>
        <td style="text-align: right; font-weight: 700; color: #16a34a; font-size: 0.9rem;">
          ${entry.correctCount}
        </td>
        <td style="text-align: right; font-weight: 600; color: var(--text-muted); font-size: 0.88rem;">
          ${entry.totalTimeSeconds ? entry.totalTimeSeconds.toFixed(1) + 's' : '0.0s'}
        </td>
      </tr>
    `).join('');
  }

  const filterHostContestants = (list: any[]): any[] => {
    return (list || []).filter(e => {
      const uid = String(e.userId || '');
      const uname = String(e.userName || '').toLowerCase();
      if (uid.startsWith('adm_') || uid === 'usr_saicharan_super' || uname.includes('sai charan') || uname.includes('admin')) {
        return false;
      }
      return true;
    });
  };

  function attachHostWebSocketListeners(eventId: string) {
    hostUnsubs = [
      wsClient.on('EVENT_STATE_SNAPSHOT', (snap: any) => {
        if (snap.eventId !== eventId) return;
        hostEventStatus = snap.status;
        hostCurrentQuestionIdx = snap.currentQuestionIndex;
        hostRemainingSeconds = snap.questionRemainingSeconds ?? 30;
        hostCurrentQuestion = snap.question;
        if (snap.leaderboard) {
          hostLeaderboard = filterHostContestants(snap.leaderboard);
        }
        renderHostConsoleBody();
      }),

      wsClient.on('QUESTION_SENT', (data: any) => {
        if (data.eventId !== eventId) return;
        hostEventStatus = 'QUESTION_ACTIVE';
        hostCurrentQuestionIdx = data.questionIndex;
        hostCurrentQuestion = data.question;
        hostTotalQuestionSeconds = data.question?.timerSeconds || 30;
        hostRemainingSeconds = hostTotalQuestionSeconds;
        hostQuestionAnswerCount = 0;
        renderHostConsoleBody();
      }),

      wsClient.on('QUESTION_TIMER_STARTED', (data: any) => {
        if (data.eventId !== eventId) return;
        hostRemainingSeconds = data.remainingSeconds;
        const timerDisp = container.querySelector('#host-timer-display');
        if (timerDisp) timerDisp.textContent = `${hostRemainingSeconds}s Remaining`;
      }),

      wsClient.on('ADMIN_SCORE_UPDATED', (data: any) => {
        if (data.eventId === eventId) {
          if (data.answersSubmittedCount !== undefined) {
            hostQuestionAnswerCount = data.answersSubmittedCount;
          } else {
            hostQuestionAnswerCount += 1;
          }
          if (data.leaderboard) {
            hostLeaderboard = filterHostContestants(data.leaderboard);
            const tbody = container.querySelector('#host-scoreboard-tbody');
            const count = container.querySelector('#host-lead-count');
            if (tbody) tbody.innerHTML = renderHostScoreboardRows();
            if (count) count.textContent = `${hostLeaderboard.length} Participants Ranked`;
          }
          renderHostConsoleBody();
        }
      }),

      wsClient.on('ADMIN_QUESTION_REVIEW', (data: any) => {
        if (data.eventId === eventId && data.leaderboard) {
          hostLeaderboard = filterHostContestants(data.leaderboard);
          const tbody = container.querySelector('#host-scoreboard-tbody');
          if (tbody) tbody.innerHTML = renderHostScoreboardRows();
        }
      }),

      wsClient.on('ADMIN_EVENT_CONCLUDED', (data: any) => {
        if (data.eventId === eventId && data.leaderboard) {
          hostLeaderboard = filterHostContestants(data.leaderboard);
          const tbody = container.querySelector('#host-scoreboard-tbody');
          if (tbody) tbody.innerHTML = renderHostScoreboardRows();
        }
      }),

      wsClient.on('QUESTION_ENDED', (data: any) => {
        if (data.eventId !== eventId) return;
        hostEventStatus = 'QUESTION_ENDED';
        if (data.leaderboard) {
          hostLeaderboard = filterHostContestants(data.leaderboard);
        }
        renderHostConsoleBody();
      }),

      wsClient.on('LEADERBOARD_UPDATED', (data: any) => {
        if (data.eventId !== eventId) return;
        hostLeaderboard = filterHostContestants(data.leaderboard || []);
        const tbody = container.querySelector('#host-scoreboard-tbody');
        const count = container.querySelector('#host-lead-count');
        if (tbody) tbody.innerHTML = renderHostScoreboardRows();
        if (count) count.textContent = `${hostLeaderboard.length} Participants Ranked`;
      }),

      wsClient.on('EVENT_ENDED', (data: any) => {
        if (data.eventId !== eventId) return;
        hostEventStatus = 'EVENT_ENDED';
        if (data.leaderboard) {
          hostLeaderboard = filterHostContestants(data.leaderboard);
        }
        renderHostConsoleBody();
      }),

      wsClient.on('EVENT_REGISTERED', (data: any) => {
        if (data.eventId === eventId && activeHostEvent) {
          activeHostEvent.registrationCount = data.totalRegistered;
          renderHostConsoleBody();
        }
      })
    ];
  }

  // =========================================================================
  // MODULE 1: REGISTER EVENT (Enroll participants in real time)
  // =========================================================================
  let regRegisteredUserIds = new Set<string>();
  let regRegisteredUserEmails = new Set<string>();

  async function initEventRegisterModule(preselectedEventId?: string) {
    const regEventSelector = container.querySelector<HTMLSelectElement>('#reg-event-selector');
    const regStatsContainer = container.querySelector<HTMLElement>('#reg-selected-event-stats');
    const formQuickReg = container.querySelector<HTMLFormElement>('#form-quick-register-user');
    const quickRegPick = container.querySelector<HTMLSelectElement>('#quick-reg-user-pick');
    const quickRegName = container.querySelector<HTMLInputElement>('#quick-reg-name');
    const quickRegEmail = container.querySelector<HTMLInputElement>('#quick-reg-email');
    const regSearchInput = container.querySelector<HTMLInputElement>('#reg-users-search-input');
    const regTableTbody = container.querySelector<HTMLElement>('#reg-users-table-tbody');
    const regFooterCount = container.querySelector<HTMLElement>('#reg-users-footer-count');
    const btnRefreshReg = container.querySelector<HTMLButtonElement>('#btn-refresh-reg-users');

    if (!regEventSelector) return;

    // Populate event selector
    const currentVal = preselectedEventId || regSelectedEventId || (allEvents.length > 0 ? allEvents[0].id : '');
    regSelectedEventId = currentVal;

    regEventSelector.innerHTML = `
      <option value="">-- Choose an Event to Register Users --</option>
      ${allEvents.map(e => `
        <option value="${e.id}" ${e.id === regSelectedEventId ? 'selected' : ''}>
          ${escapeHtml(e.title)} (${e.domain || 'Engineering'}) — ${e.registrationCount || 0} Registered
        </option>
      `).join('')}
    `;

    const isUserAdmin = (u: { email?: string; id?: string; name?: string }) => {
      const email = (u.email || '').toLowerCase().trim();
      const uid = String(u.id || '');
      return uid.startsWith('adm_') || uid === 'usr_saicharan_super' || email.includes('admin') || email === 'saicharanbhuthkuri468@gmail.com';
    };

    // Populate platform engineers quick-pick (excluding admins)
    if (quickRegPick) {
      const eligibleUsers = allUsers.filter(u => !isUserAdmin(u));
      quickRegPick.innerHTML = `
        <option value="">-- Select Platform Engineer --</option>
        ${eligibleUsers.map(u => `
          <option value="${u.id}">${escapeHtml(u.name)} (${escapeHtml(u.email)})</option>
        `).join('')}
      `;
      quickRegPick.onchange = () => {
        const u = eligibleUsers.find(user => user.id === quickRegPick.value);
        if (u) {
          if (quickRegName) quickRegName.value = u.name;
          if (quickRegEmail) quickRegEmail.value = u.email;
        }
      };
    }

    const loadEventRegistrations = async (eventId: string) => {
      regSelectedEventId = eventId;
      regRegisteredUserIds = new Set();
      regRegisteredUserEmails = new Set();
      renderPlatformEngineers(); // Reset UI immediately

      const ev = allEvents.find(e => e.id === eventId);
      const regBadge = container.querySelector<HTMLElement>('#reg-event-badge');

      if (!eventId || !ev) {
        if (regStatsContainer) regStatsContainer.innerHTML = '';
        if (regBadge) regBadge.textContent = 'Select Event';
        if (regTableTbody) {
          regTableTbody.innerHTML = `
            <tr>
              <td colspan="4" style="text-align: center; padding: 3rem 2rem; color: var(--text-muted);">
                Please select a target event above to manage registrations.
              </td>
            </tr>
          `;
        }
        return;
      }

      if (regBadge) regBadge.textContent = ev.title;

      const isLive = ev.status === 'LIVE_NOW' || ev.status === 'LOBBY' || ev.status === 'QUESTION_ACTIVE';
      const statusBadge = isLive
        ? `<span class="event-status-chip live"><span class="pulse-dot"></span> LIVE NOW</span>`
        : ev.status === 'COMPLETED'
          ? `<span class="event-status-chip ended">COMPLETED</span>`
          : `<span class="event-status-chip upcoming">UPCOMING</span>`;

      if (regStatsContainer) {
        regStatsContainer.innerHTML = `
          ${statusBadge}
          <span class="admin-event-reg-count" id="reg-active-count-chip">${ev.registrationCount || 0} Registered</span>
          <span class="event-domain-tag">${escapeHtml(ev.domain || 'Engineering')}</span>
        `;
      }

      // Fetch participants for this event
      try {
        const pRes = await apiGetEventParticipants(eventId);
        if (pRes.success && pRes.participants) {
          const filtered = pRes.participants.filter(p => !isUserAdmin({ id: p.userId, email: p.userEmail }));
          regRegisteredUserIds = new Set(filtered.map(p => p.userId));
          regRegisteredUserEmails = new Set(filtered.map(p => p.userEmail.toLowerCase().trim()));
          ev.registrationCount = filtered.length;
          const chip = container.querySelector('#reg-active-count-chip');
          if (chip) chip.textContent = `${ev.registrationCount} Registered`;
        }
      } catch (err) {
        console.error('Failed to load event participants:', err);
      }
      renderPlatformEngineers();
    };

    const renderPlatformEngineers = () => {
      if (!regTableTbody) return;
      const q = (regSearchInput?.value || '').toLowerCase().trim();
      const eligibleUsers = allUsers.filter(u => !isUserAdmin(u));
      const filtered = eligibleUsers.filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.branch || '').toLowerCase().includes(q)
      );

      if (regFooterCount) {
        regFooterCount.textContent = `Showing ${filtered.length} of ${eligibleUsers.length} platform engineers (${regRegisteredUserIds.size} enrolled in this event)`;
      }

      if (filtered.length === 0) {
        regTableTbody.innerHTML = `
          <tr>
            <td colspan="4" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
              No platform engineers found matching "${escapeHtml(q)}".
            </td>
          </tr>
        `;
        return;
      }

      regTableTbody.innerHTML = filtered.map(u => {
        const isRegistered = regRegisteredUserIds.has(u.id) || regRegisteredUserEmails.has(u.email.toLowerCase().trim());
        return `
          <tr>
            <td>
              <div style="display: flex; align-items: center; gap: 0.65rem;">
                ${renderAlphabetAvatar(u.name, 'table-avatar-sm')}
                <div>
                  <strong style="color: var(--text-main); font-size: 0.92rem; display: block;">${escapeHtml(u.name)}</strong>
                  <span style="font-size: 0.76rem; color: var(--text-muted);">${escapeHtml(u.badge || 'Verified Engineer')}</span>
                </div>
              </div>
            </td>
            <td>
              <div style="display: flex; flex-direction: column; gap: 0.2rem;">
                <span style="font-size: 0.85rem; color: var(--text-secondary);">${escapeHtml(u.email)}</span>
                <span class="user-branch-badge ${getBranchClass(u.branch || '')}" style="align-self: flex-start; font-size: 0.72rem; padding: 0.15rem 0.5rem;">
                  ${escapeHtml(u.branch || 'Engineering')}
                </span>
              </div>
            </td>
            <td>
              <span style="font-weight: 700; color: #4338ca; font-size: 0.92rem;">${u.xp || 0} XP</span>
            </td>
            <td style="text-align: right;">
              <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.45rem;">
                ${isRegistered ? `
                  <span class="registered-chip">${icon('CheckCircle2', 13)} Enrolled</span>
                  <button class="btn btn-pill-sm btn-unreg-engineer" data-uid="${u.id}" data-name="${escapeHtml(u.name)}" style="background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; font-size: 0.74rem; padding: 0.25rem 0.55rem;" title="Remove registration">
                    ${icon('UserMinus', 12)}
                  </button>
                ` : `
                  <button class="btn btn-primary btn-pill-sm btn-enroll-engineer" data-uid="${u.id}" data-name="${escapeHtml(u.name)}" data-email="${escapeHtml(u.email)}" style="font-size: 0.78rem; padding: 0.32rem 0.85rem;">
                    ${icon('UserPlus', 13)} Register
                  </button>
                `}
              </div>
            </td>
          </tr>
        `;
      }).join('');

      // Attach row 1-click register & unregister buttons
      regTableTbody.querySelectorAll('.btn-enroll-engineer').forEach(btn => {
        btn.addEventListener('click', async () => {
          soundEngine.playClick();
          if (!regSelectedEventId) {
            showToast('Please select a target event first.', 'warn');
            return;
          }
          const uid = btn.getAttribute('data-uid') || '';
          const uname = btn.getAttribute('data-name') || '';
          const uemail = btn.getAttribute('data-email') || '';

          try {
            const res = await apiRegisterForEvent(regSelectedEventId, {
              userId: uid,
              userName: uname,
              userEmail: uemail
            });
            if (res.success) {
              soundEngine.playCorrect();
              showToast(`${uname} registered for event!`, 'success');
              regRegisteredUserIds.add(uid);
              regRegisteredUserEmails.add(uemail.toLowerCase().trim());
              const ev = allEvents.find(e => e.id === regSelectedEventId);
              if (ev) {
                ev.registrationCount = res.totalRegistered || (ev.registrationCount || 0) + 1;
                const chip = container.querySelector('#reg-active-count-chip');
                if (chip) chip.textContent = `${ev.registrationCount} Registered`;
              }
              renderPlatformEngineers();
            } else {
              showToast(res.message || 'Registration failed.', 'warn');
            }
          } catch (err) {
            console.error('Registration error:', err);
            showToast('Failed to register user.', 'warn');
          }
        });
      });

      regTableTbody.querySelectorAll('.btn-unreg-engineer').forEach(btn => {
        btn.addEventListener('click', async () => {
          soundEngine.playClick();
          if (!regSelectedEventId) return;
          const uid = btn.getAttribute('data-uid') || '';
          const uname = btn.getAttribute('data-name') || '';

          try {
            const res = await apiUnregisterEventParticipant(regSelectedEventId, uid);
            if (res.success) {
              soundEngine.playClick();
              showToast(`${uname} removed from event.`, 'info');
              regRegisteredUserIds.delete(uid);
              const u = allUsers.find(user => user.id === uid);
              if (u) regRegisteredUserEmails.delete(u.email.toLowerCase().trim());
              const ev = allEvents.find(e => e.id === regSelectedEventId);
              if (ev && ev.registrationCount && ev.registrationCount > 0) {
                ev.registrationCount -= 1;
                const chip = container.querySelector('#reg-active-count-chip');
                if (chip) chip.textContent = `${ev.registrationCount} Registered`;
              }
              renderPlatformEngineers();
            }
          } catch (err) {
            console.error('Unregister error:', err);
            showToast('Failed to unregister participant.', 'warn');
          }
        });
      });
    };

    regEventSelector.onchange = () => {
      soundEngine.playClick();
      loadEventRegistrations(regEventSelector.value);
    };

    regSearchInput?.addEventListener('input', () => renderPlatformEngineers());

    btnRefreshReg?.addEventListener('click', async () => {
      soundEngine.playClick();
      await loadAllData();
      if (regSelectedEventId) await loadEventRegistrations(regSelectedEventId);
    });

    // Handle Manual / Pick Form Submit
    if (formQuickReg) {
      formQuickReg.onsubmit = async (e) => {
        e.preventDefault();
        soundEngine.playClick();
        if (!regSelectedEventId) {
          showToast('Please select a target event first.', 'warn');
          return;
        }

        const name = quickRegName?.value.trim() || '';
        const email = quickRegEmail?.value.trim() || '';
        if (!name || !email) {
          showToast('Name and email are required.', 'warn');
          return;
        }

        const existingUser = allUsers.find(u => u.email.toLowerCase().trim() === email.toLowerCase().trim());
        const uid = existingUser ? existingUser.id : 'ext_' + Math.random().toString(36).substring(2, 9);

        try {
          const res = await apiRegisterForEvent(regSelectedEventId, {
            userId: uid,
            userName: name,
            userEmail: email
          });

          if (res.success) {
            soundEngine.playCorrect();
            showToast(`Successfully enrolled ${name}!`, 'success');
            regRegisteredUserIds.add(uid);
            regRegisteredUserEmails.add(email.toLowerCase().trim());
            if (quickRegPick) quickRegPick.value = '';
            if (quickRegName) quickRegName.value = '';
            if (quickRegEmail) quickRegEmail.value = '';
            const ev = allEvents.find(event => event.id === regSelectedEventId);
            if (ev) {
              ev.registrationCount = res.totalRegistered || (ev.registrationCount || 0) + 1;
              const chip = container.querySelector('#reg-active-count-chip');
              if (chip) chip.textContent = `${ev.registrationCount} Registered`;
            }
            renderPlatformEngineers();
          } else {
            showToast(res.message || 'Registration failed.', 'warn');
          }
        } catch (err) {
          console.error(err);
          showToast('Error registering participant.', 'warn');
        }
      };
    }

    if (regSelectedEventId) {
      await loadEventRegistrations(regSelectedEventId);
    }
  }

  // =========================================================================
  // MODULE 2: EVENT PARTICIPANTS (View, Audit, Manage, and Export)
  // =========================================================================
  interface LoadedParticipantItem {
    userId: string;
    userName: string;
    userEmail: string;
    registeredAt: string;
    eventId: string;
    eventTitle: string;
  }
  let loadedParticipantsList: LoadedParticipantItem[] = [];

  async function initEventParticipantsModule(preselectedEventId?: string) {
    const partFilterEvent = container.querySelector<HTMLSelectElement>('#part-filter-event');
    const partSearchInput = container.querySelector<HTMLInputElement>('#part-search-input');
    const partTbody = container.querySelector<HTMLElement>('#part-table-tbody');
    const partTotalBadge = container.querySelector<HTMLElement>('#part-total-badge');
    const partFooterCount = container.querySelector<HTMLElement>('#part-table-footer-count');
    const btnRefreshPart = container.querySelector<HTMLButtonElement>('#btn-refresh-part-list');
    const btnExportPartCsv = container.querySelector<HTMLButtonElement>('#btn-export-participants-csv');

    const partMetricsBar = container.querySelector<HTMLElement>('#part-event-metrics');

    if (!partFilterEvent) return;

    if (preselectedEventId) {
      partSelectedEventId = preselectedEventId;
    } else if (!partSelectedEventId && allEvents.length > 0) {
      partSelectedEventId = allEvents[0].id;
    }

    partFilterEvent.innerHTML = `
      <option value="">-- Choose an Event to View Participants --</option>
      ${allEvents.map(e => `
        <option value="${e.id}" ${e.id === partSelectedEventId ? 'selected' : ''}>
          ${escapeHtml(e.title)} (${e.domain || 'Engineering'}) — [${e.status}]
        </option>
      `).join('')}
    `;

    const fetchParticipantsData = async () => {
      loadedParticipantsList = [];
      const ev = allEvents.find(e => e.id === partSelectedEventId);

      if (!partSelectedEventId || !ev) {
        if (partTotalBadge) partTotalBadge.textContent = '0 Participants';
        if (partFooterCount) partFooterCount.textContent = 'Select an event above';
        if (partMetricsBar) partMetricsBar.innerHTML = '';
        if (partTbody) {
          partTbody.innerHTML = `
            <tr>
              <td colspan="5" style="text-align: center; padding: 4rem 2rem; color: var(--text-muted);">
                <span style="display: block; margin-bottom: 0.5rem;">${icon('Users', 36)}</span>
                <h4 style="font-size: 1.05rem; color: var(--text-main); margin-bottom: 0.25rem;">No Event Selected</h4>
                <p style="font-size: 0.85rem; margin: 0;">Please choose a competitive event above to view its registered participants.</p>
              </td>
            </tr>
          `;
        }
        return;
      }

      if (partMetricsBar) {
        const isLive = ev.status === 'LIVE_NOW' || ev.status === 'LOBBY' || ev.status === 'QUESTION_ACTIVE';
        partMetricsBar.innerHTML = `
          ${isLive ? `<span class="event-status-chip live"><span class="pulse-dot"></span> LIVE NOW</span>` : ev.status === 'COMPLETED' ? `<span class="event-status-chip ended">COMPLETED</span>` : `<span class="event-status-chip upcoming">UPCOMING</span>`}
          <span class="event-domain-tag">${escapeHtml(ev.domain || 'Engineering')}</span>
        `;
      }

      if (partTbody) {
        partTbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; padding: 3rem 2rem;">
              <div class="admin-loading-spinner"></div>
              <span style="color: var(--text-muted); font-size: 0.9rem; margin-top: 0.5rem; display: block;">Loading participants for ${escapeHtml(ev.title)}...</span>
            </td>
          </tr>
        `;
      }

      try {
        const res = await apiGetEventParticipants(partSelectedEventId);
        if (res.success && res.participants) {
          loadedParticipantsList = res.participants
            .filter(p => {
              const uid = String(p.userId || '');
              const email = String(p.userEmail || '').toLowerCase();
              if (uid.startsWith('adm_') || uid === 'usr_saicharan_super' || email.includes('admin') || email === 'saicharanbhuthkuri468@gmail.com') {
                return false;
              }
              return true;
            })
            .map(p => ({
              userId: p.userId,
              userName: p.userName,
              userEmail: p.userEmail,
              registeredAt: p.registeredAt,
              eventId: partSelectedEventId,
              eventTitle: ev.title
            }));
          ev.registrationCount = loadedParticipantsList.length;
        }
      } catch (err) {
        console.error('Fetch participants error:', err);
      }

      renderParticipantsTable();
    };

    const renderParticipantsTable = () => {
      if (!partTbody) return;
      const ev = allEvents.find(e => e.id === partSelectedEventId);
      const evTitle = ev ? ev.title : 'Selected Event';
      const q = (partSearchInput?.value || '').toLowerCase().trim();
      const filtered = loadedParticipantsList.filter(p =>
        p.userName.toLowerCase().includes(q) ||
        p.userEmail.toLowerCase().includes(q)
      );

      if (partTotalBadge) partTotalBadge.textContent = `${loadedParticipantsList.length} Participants`;
      if (partFooterCount) partFooterCount.textContent = `Showing ${filtered.length} of ${loadedParticipantsList.length} enrolled participants for ${escapeHtml(evTitle)}`;

      if (filtered.length === 0) {
        partTbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; padding: 3rem 2rem;">
              <span style="color: var(--text-muted); display: block; margin-bottom: 0.5rem;">${icon('Users', 36)}</span>
              <h4 style="font-size: 1.05rem; color: var(--text-main); margin-bottom: 0.25rem;">No Participants Found</h4>
              <p style="color: var(--text-muted); font-size: 0.85rem;">No registered participants matched your search criteria or event selection.</p>
            </td>
          </tr>
        `;
        return;
      }

      partTbody.innerHTML = filtered.map((p, idx) => `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <span style="font-weight: 700; color: #64748b; font-size: 0.82rem; min-width: 22px;">#${idx + 1}</span>
              ${renderAlphabetAvatar(p.userName, 'table-avatar-sm')}
              <strong style="color: var(--text-main); font-size: 0.92rem;">${escapeHtml(p.userName)}</strong>
            </div>
          </td>
          <td>
            <span style="font-size: 0.88rem; color: var(--text-secondary);">${escapeHtml(p.userEmail)}</span>
          </td>
          <td>
            <span class="event-domain-tag" style="max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-block;">
              ${escapeHtml(p.eventTitle)}
            </span>
          </td>
          <td>
            <span style="font-size: 0.82rem; color: var(--text-muted);">${formatDate(p.registeredAt)}</span>
          </td>
          <td style="text-align: right;">
            <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.45rem;">
              <button class="btn btn-secondary btn-icon-round btn-view-part-user" data-email="${escapeHtml(p.userEmail)}" title="View Profile">
                ${icon('Eye', 13)}
              </button>
              <button class="btn btn-secondary btn-icon-round btn-view-full-event-part" data-eid="${p.eventId}" title="View Full Event Roster">
                ${icon('Users', 13)}
              </button>
              <button class="btn btn-icon-round btn-danger-soft btn-unregister-part" data-eid="${p.eventId}" data-uid="${p.userId}" data-name="${escapeHtml(p.userName)}" title="Unregister Participant">
                ${icon('UserMinus', 13)}
              </button>
            </div>
          </td>
        </tr>
      `).join('');

      // Wire profile modal button
      partTbody.querySelectorAll('.btn-view-part-user').forEach(btn => {
        btn.addEventListener('click', () => {
          soundEngine.playClick();
          const email = btn.getAttribute('data-email');
          const user = allUsers.find(u => u.email.toLowerCase() === (email || '').toLowerCase());
          if (user) {
            openUserModal(user);
          } else {
            showToast('User profile record not found.', 'info');
          }
        });
      });

      // Wire modal view for full event roster
      partTbody.querySelectorAll('.btn-view-full-event-part').forEach(btn => {
        btn.addEventListener('click', () => {
          soundEngine.playClick();
          const eid = btn.getAttribute('data-eid') || '';
          if (eid) openParticipantsModal(eid);
        });
      });

      // Wire unregister participant button
      partTbody.querySelectorAll('.btn-unregister-part').forEach(btn => {
        btn.addEventListener('click', async () => {
          soundEngine.playClick();
          const eid = btn.getAttribute('data-eid') || '';
          const uid = btn.getAttribute('data-uid') || '';
          const uname = btn.getAttribute('data-name') || '';

          if (!confirm(`Are you sure you want to unregister ${uname} from this event?`)) return;

          try {
            const res = await apiUnregisterEventParticipant(eid, uid);
            if (res.success) {
              soundEngine.playCorrect();
              showToast(`${uname} unregistered successfully.`, 'info');
              loadedParticipantsList = loadedParticipantsList.filter(item => !(item.eventId === eid && item.userId === uid));
              renderParticipantsTable();
              const ev = allEvents.find(e => e.id === eid);
              if (ev && ev.registrationCount && ev.registrationCount > 0) {
                ev.registrationCount -= 1;
              }
            } else {
              showToast('Failed to unregister participant.', 'warn');
            }
          } catch (err) {
            console.error(err);
            showToast('Network error while unregistering.', 'warn');
          }
        });
      });
    };

    partFilterEvent.onchange = () => {
      soundEngine.playClick();
      partSelectedEventId = partFilterEvent.value;
      fetchParticipantsData();
    };

    partSearchInput?.addEventListener('input', () => renderParticipantsTable());

    btnRefreshPart?.addEventListener('click', () => {
      soundEngine.playClick();
      fetchParticipantsData();
    });

    if (btnExportPartCsv) {
      btnExportPartCsv.onclick = () => {
        soundEngine.playClick();
        if (loadedParticipantsList.length === 0) {
          showToast('No participants to export.', 'info');
          return;
        }
        const headers = ['#', 'Participant Name', 'Email Address', 'Enrolled Event', 'Registered At'];
        const rows = loadedParticipantsList.map((p, idx) => [
          idx + 1,
          `"${p.userName.replace(/"/g, '""')}"`,
          `"${p.userEmail.replace(/"/g, '""')}"`,
          `"${p.eventTitle.replace(/"/g, '""')}"`,
          `"${p.registeredAt}"`
        ]);
        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `event_participants_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Participants CSV exported successfully!', 'success');
      };
    }

    await fetchParticipantsData();
  }

  // =========================================================================
  // MODULE 3: QUESTION MANAGEMENT (Add, Edit, Delete, Organize Questions)
  // =========================================================================
  let qmLoadedQuestions: EventQuestion[] = [];

  async function initQuestionManagementModule(preselectedEventId?: string) {
    const qmEventSelector = container.querySelector<HTMLSelectElement>('#qm-event-selector');
    const qmMetricsBar = container.querySelector<HTMLElement>('#qm-event-metrics');
    const qmSearchInput = container.querySelector<HTMLInputElement>('#qm-search-input');
    const qmTbody = container.querySelector<HTMLElement>('#qm-table-tbody');
    const qmBadge = container.querySelector<HTMLElement>('#qm-questions-badge');
    const qmFooterCount = container.querySelector<HTMLElement>('#qm-table-footer-count');
    const btnRefreshQm = container.querySelector<HTMLButtonElement>('#btn-refresh-qm');
    const btnQmAddQ = container.querySelector<HTMLButtonElement>('#btn-qm-add-question');

    // Edit modal elements
    const editModal = container.querySelector<HTMLElement>('#admin-edit-question-modal');
    const btnCloseEditModal = container.querySelector<HTMLButtonElement>('#btn-close-edit-q-modal');
    const btnCancelEditModal = container.querySelector<HTMLButtonElement>('#btn-cancel-edit-q');
    const formEditQ = container.querySelector<HTMLFormElement>('#form-edit-question');

    if (!qmEventSelector) return;

    if (preselectedEventId) {
      qmSelectedEventId = preselectedEventId;
    } else if (!qmSelectedEventId && allEvents.length > 0) {
      qmSelectedEventId = allEvents[0].id;
    }

    qmEventSelector.innerHTML = `
      <option value="">-- Choose an Event to Manage Questions --</option>
      ${allEvents.map(e => `
        <option value="${e.id}" ${e.id === qmSelectedEventId ? 'selected' : ''}>
          ${escapeHtml(e.title)} (${e.domain || 'Engineering'}) — ${e.questionCount || 0} Questions
        </option>
      `).join('')}
    `;

    const loadQuestions = async (eventId: string) => {
      qmSelectedEventId = eventId;
      const ev = allEvents.find(e => e.id === eventId);

      if (!eventId || !ev) {
        if (qmMetricsBar) qmMetricsBar.innerHTML = '';
        if (qmBadge) qmBadge.textContent = '0 Questions';
        if (qmTbody) {
          qmTbody.innerHTML = `
            <tr>
              <td colspan="6" style="text-align: center; padding: 4rem 2rem; color: var(--text-muted);">
                Please select an event above to view and manage its questions.
              </td>
            </tr>
          `;
        }
        return;
      }

      if (qmTbody) {
        qmTbody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; padding: 3rem 2rem;">
              <div class="admin-loading-spinner"></div>
              <span style="color: var(--text-muted); font-size: 0.9rem; margin-top: 0.5rem; display: block;">Loading event questions...</span>
            </td>
          </tr>
        `;
      }

      try {
        const res = await apiGetEventQuestions(eventId, 'admin');
        if (res.success) {
          qmLoadedQuestions = res.questions;
          ev.questionCount = qmLoadedQuestions.length;
        } else {
          qmLoadedQuestions = [];
        }
      } catch (err) {
        console.error('Failed to load questions:', err);
        qmLoadedQuestions = [];
      }

      renderQuestionsTable();
    };

    const renderQuestionsTable = () => {
      if (!qmTbody) return;
      const q = (qmSearchInput?.value || '').toLowerCase().trim();
      const filtered = qmLoadedQuestions.filter(question =>
        question.questionText.toLowerCase().includes(q) ||
        (question.explanation || '').toLowerCase().includes(q)
      );

      const totalPoints = qmLoadedQuestions.reduce((sum, item) => sum + (item.points || 100), 0);
      const totalSeconds = qmLoadedQuestions.reduce((sum, item) => sum + (item.timerSeconds || 30), 0);
      const estimatedMins = Math.max(1, Math.round(totalSeconds / 60));

      if (qmBadge) qmBadge.textContent = `${qmLoadedQuestions.length} Questions`;
      if (qmFooterCount) qmFooterCount.textContent = `Showing ${filtered.length} of ${qmLoadedQuestions.length} questions in sequence`;

      if (qmMetricsBar) {
        qmMetricsBar.innerHTML = `
          <div style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap;">
            <span class="portal-stat-pill" style="border-color: #c7d2fe; background: #eef2ff; color: #4338ca;">
              ${icon('HelpCircle', 13)} ${qmLoadedQuestions.length} Questions
            </span>
            <span class="portal-stat-pill" style="border-color: #bbf7d0; background: #f0fdf4; color: #15803d;">
              ${icon('Award', 13)} ${totalPoints} XP Total
            </span>
            <span class="portal-stat-pill" style="border-color: #fde68a; background: #fefce8; color: #a16207;">
              ${icon('Clock', 13)} ~${estimatedMins} min duration
            </span>
          </div>
        `;
      }

      if (filtered.length === 0) {
        qmTbody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; padding: 4rem 2rem;">
              <span style="color: var(--text-muted); display: block; margin-bottom: 0.5rem;">${icon('HelpCircle', 36)}</span>
              <h4 style="font-size: 1.05rem; color: var(--text-main); margin-bottom: 0.25rem;">No Questions Found</h4>
              <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1rem;">No questions match this event yet. Click "Add New Question" to create questions.</p>
            </td>
          </tr>
        `;
        return;
      }

      qmTbody.innerHTML = filtered.map((item, idx) => {
        const correctIdx = item.correctOption ?? 0;
        const correctLetter = String.fromCharCode(65 + correctIdx);

        return `
          <tr>
            <td>
              <span class="event-status-chip" style="font-weight: 800; background: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe; padding: 0.25rem 0.6rem;">
                Q${item.questionOrder || idx + 1}
              </span>
            </td>
            <td>
              <div style="display: flex; flex-direction: column; gap: 0.3rem;">
                <strong style="color: var(--text-main); font-size: 0.95rem; font-weight: 700; line-height: 1.4;">${escapeHtml(item.questionText)}</strong>
                ${item.explanation ? `
                  <span style="font-size: 0.78rem; color: #64748b; display: flex; align-items: center; gap: 0.3rem;">
                    ${icon('Info', 12)} ${escapeHtml(item.explanation)}
                  </span>
                ` : ''}
              </div>
            </td>
            <td>
              <div style="display: flex; flex-direction: column; gap: 0.35rem;">
                <div class="qm-options-list">
                  ${item.options.map((opt, oIdx) => {
          const isCorrect = oIdx === correctIdx;
          return `
                      <span class="qm-option-row ${isCorrect ? 'correct' : ''}">
                        <strong>${String.fromCharCode(65 + oIdx)}:</strong> ${escapeHtml(opt)}
                        ${isCorrect ? `<span class="opt-check">${icon('Check', 11)}</span>` : ''}
                      </span>
                    `;
        }).join('')}
                </div>
                <span style="font-size: 0.76rem; font-weight: 700; color: #15803d; display: flex; align-items: center; gap: 0.25rem;">
                  ${icon('CheckCircle2', 12)} Correct: Option ${correctLetter}
                </span>
              </div>
            </td>
            <td>
              <span style="font-weight: 700; color: #4338ca; font-size: 0.9rem;">+${item.points || 100} XP</span>
            </td>
            <td>
              <span style="font-weight: 600; color: var(--text-muted); font-size: 0.85rem;">${item.timerSeconds || 30}s</span>
            </td>
            <td style="text-align: right;">
              <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.45rem;">
                <button class="btn btn-secondary btn-pill-sm btn-edit-question-trigger" data-qid="${item.id}" style="font-size: 0.78rem; padding: 0.35rem 0.75rem;">
                  <span>${icon('Edit3', 13)} Edit</span>
                </button>
                <button class="btn btn-icon-round btn-danger-soft btn-delete-question-trigger" data-qid="${item.id}" title="Delete Question">
                  <span>${icon('Trash2', 13)}</span>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      // Wire edit triggers
      qmTbody.querySelectorAll('.btn-edit-question-trigger').forEach(btn => {
        btn.addEventListener('click', () => {
          soundEngine.playClick();
          const qid = btn.getAttribute('data-qid');
          const qObj = qmLoadedQuestions.find(item => item.id === qid);
          if (!qObj || !editModal) return;

          const editIdInput = container.querySelector<HTMLInputElement>('#edit-q-id');
          const editEidInput = container.querySelector<HTMLInputElement>('#edit-q-event-id');
          const editTextInput = container.querySelector<HTMLInputElement>('#edit-q-text');
          const editOpt0 = container.querySelector<HTMLInputElement>('#edit-q-opt-0');
          const editOpt1 = container.querySelector<HTMLInputElement>('#edit-q-opt-1');
          const editOpt2 = container.querySelector<HTMLInputElement>('#edit-q-opt-2');
          const editOpt3 = container.querySelector<HTMLInputElement>('#edit-q-opt-3');
          const editCorrect = container.querySelector<HTMLSelectElement>('#edit-q-correct');
          const editTimer = container.querySelector<HTMLInputElement>('#edit-q-timer');
          const editPoints = container.querySelector<HTMLInputElement>('#edit-q-points');
          const editExpl = container.querySelector<HTMLInputElement>('#edit-q-explanation');

          if (editIdInput) editIdInput.value = qObj.id;
          if (editEidInput) editEidInput.value = qmSelectedEventId;
          if (editTextInput) editTextInput.value = qObj.questionText;
          if (editOpt0) editOpt0.value = qObj.options[0] || '';
          if (editOpt1) editOpt1.value = qObj.options[1] || '';
          if (editOpt2) editOpt2.value = qObj.options[2] || '';
          if (editOpt3) editOpt3.value = qObj.options[3] || '';
          if (editCorrect) editCorrect.value = String(qObj.correctOption ?? 0);
          if (editTimer) editTimer.value = String(qObj.timerSeconds || 30);
          if (editPoints) editPoints.value = String(qObj.points || 100);
          if (editExpl) editExpl.value = qObj.explanation || '';

          editModal.style.display = 'flex';
          editTextInput?.focus();
        });
      });

      // Wire delete triggers
      qmTbody.querySelectorAll('.btn-delete-question-trigger').forEach(btn => {
        btn.addEventListener('click', async () => {
          soundEngine.playClick();
          const qid = btn.getAttribute('data-qid');
          if (!qid || !qmSelectedEventId) return;
          if (!confirm('Are you sure you want to delete this question?')) return;

          try {
            const delRes = await apiDeleteEventQuestion(qmSelectedEventId, qid);
            if (delRes.success) {
              soundEngine.playCorrect();
              showToast('Question deleted successfully.', 'info');
              qmLoadedQuestions = qmLoadedQuestions.filter(item => item.id !== qid);
              renderQuestionsTable();
              const ev = allEvents.find(e => e.id === qmSelectedEventId);
              if (ev) ev.questionCount = qmLoadedQuestions.length;
            } else {
              showToast('Failed to delete question.', 'warn');
            }
          } catch (err) {
            console.error(err);
            showToast('Network error while deleting question.', 'warn');
          }
        });
      });
    };

    qmEventSelector.onchange = () => {
      soundEngine.playClick();
      loadQuestions(qmEventSelector.value);
    };

    qmSearchInput?.addEventListener('input', () => renderQuestionsTable());

    btnRefreshQm?.addEventListener('click', () => {
      soundEngine.playClick();
      if (qmSelectedEventId) loadQuestions(qmSelectedEventId);
    });

    if (btnQmAddQ) {
      btnQmAddQ.onclick = () => {
        soundEngine.playClick();
        if (!qmSelectedEventId) {
          showToast('Please select an event first.', 'warn');
          return;
        }
        openQuestionsModal(qmSelectedEventId);
      };
    }

    // Edit modal form submission
    const closeEditModal = () => {
      if (editModal) editModal.style.display = 'none';
    };
    btnCloseEditModal?.addEventListener('click', closeEditModal);
    btnCancelEditModal?.addEventListener('click', closeEditModal);
    editModal?.addEventListener('click', (e) => {
      if (e.target === editModal) closeEditModal();
    });

    if (formEditQ) {
      formEditQ.onsubmit = async (e) => {
        e.preventDefault();
        soundEngine.playClick();
        const qid = container.querySelector<HTMLInputElement>('#edit-q-id')?.value || '';
        const eid = container.querySelector<HTMLInputElement>('#edit-q-event-id')?.value || '';
        const qText = container.querySelector<HTMLInputElement>('#edit-q-text')?.value.trim() || '';
        const opt0 = container.querySelector<HTMLInputElement>('#edit-q-opt-0')?.value.trim() || '';
        const opt1 = container.querySelector<HTMLInputElement>('#edit-q-opt-1')?.value.trim() || '';
        const opt2 = container.querySelector<HTMLInputElement>('#edit-q-opt-2')?.value.trim() || '';
        const opt3 = container.querySelector<HTMLInputElement>('#edit-q-opt-3')?.value.trim() || '';
        const correct = Number(container.querySelector<HTMLSelectElement>('#edit-q-correct')?.value || 0);
        const timer = Number(container.querySelector<HTMLInputElement>('#edit-q-timer')?.value || 30);
        const points = Number(container.querySelector<HTMLInputElement>('#edit-q-points')?.value || 100);
        const expl = container.querySelector<HTMLInputElement>('#edit-q-explanation')?.value.trim() || '';

        if (!qText || !opt0 || !opt1) {
          showToast('Question text and at least options A and B are required.', 'warn');
          return;
        }

        try {
          const res = await apiUpdateEventQuestion(eid, qid, {
            questionText: qText,
            options: [opt0, opt1, opt2, opt3].filter(Boolean),
            correctOption: correct,
            explanation: expl,
            timerSeconds: timer,
            points: points
          });

          if (res.success) {
            soundEngine.playCorrect();
            showToast('Question updated and synchronized!', 'success');
            closeEditModal();
            await loadQuestions(eid);
          } else {
            showToast(res.message || 'Failed to update question.', 'warn');
          }
        } catch (err) {
          console.error(err);
          showToast('Network error while updating question.', 'warn');
        }
      };
    }

    if (qmSelectedEventId) {
      await loadQuestions(qmSelectedEventId);
    }
  }

  // =========================================================================
  // MODULE 4: EXAM MANAGEMENT (Start, Send/Next, Timer, Pause/Resume, End)
  // =========================================================================
  let examUnsubs: (() => void)[] = [];
  let examQuestions: EventQuestion[] = [];
  let examCurrentQIdx = -1;
  let examRemainingSeconds = 30;
  let examTotalSeconds = 30;
  let examIsPaused = false;
  let examStatus = 'UPCOMING';
  let examAnswerCount = 0;
  let examCurrentQuestion: EventQuestion | null = null;
  let examActivityLogs: { time: string; text: string; type: 'info' | 'success' | 'warn' }[] = [];

  async function initExamManagementModule(preselectedEventId?: string) {
    const examEventSelector = container.querySelector<HTMLSelectElement>('#exam-event-selector');
    const examTagsContainer = container.querySelector<HTMLElement>('#exam-selected-event-tags');
    const examViewport = container.querySelector<HTMLElement>('#exam-mgmt-viewport');

    if (!examEventSelector) return;

    if (preselectedEventId) {
      examSelectedEventId = preselectedEventId;
    } else if (!examSelectedEventId) {
      const liveEv = allEvents.find(e => e.status === 'LIVE_NOW' || e.status === 'LOBBY' || e.status === 'QUESTION_ACTIVE');
      examSelectedEventId = liveEv ? liveEv.id : (allEvents.length > 0 ? allEvents[0].id : '');
    }

    examEventSelector.innerHTML = `
      <option value="">-- Choose an Event to Broadcast & Control --</option>
      ${allEvents.map(e => `
        <option value="${e.id}" ${e.id === examSelectedEventId ? 'selected' : ''}>
          ${escapeHtml(e.title)} (${e.domain || 'Engineering'}) — [${e.status}]
        </option>
      `).join('')}
    `;

    const addExamLog = (text: string, type: 'info' | 'success' | 'warn' = 'info') => {
      const time = new Date().toLocaleTimeString();
      examActivityLogs.unshift({ time, text, type });
      if (examActivityLogs.length > 25) examActivityLogs.pop();
      renderExamLogs();
    };

    const renderExamLogs = () => {
      const logBox = container.querySelector<HTMLElement>('#exam-activity-log-feed');
      if (!logBox) return;
      if (examActivityLogs.length === 0) {
        logBox.innerHTML = `<span style="color: var(--text-muted); font-size: 0.8rem;">No activity recorded yet for this exam session.</span>`;
        return;
      }
      logBox.innerHTML = examActivityLogs.map(l => `
        <div class="exam-log-item log-${l.type}">
          <span class="exam-log-time">${l.time}</span>
          <span class="exam-log-text">${escapeHtml(l.text)}</span>
        </div>
      `).join('');
    };

    const setupExamController = async (eventId: string) => {
      examSelectedEventId = eventId;
      examUnsubs.forEach(u => u());
      examUnsubs = [];
      examActivityLogs = [];
      examQuestions = [];
      examAnswerCount = 0;

      const ev = allEvents.find(e => e.id === eventId);
      if (!eventId || !ev) {
        if (examTagsContainer) examTagsContainer.innerHTML = '';
        if (examViewport) {
          examViewport.innerHTML = `
            <div style="text-align: center; padding: 4rem 2rem; background: #ffffff; border-radius: var(--radius-xl); border: 1.5px solid var(--border-card);">
              <span style="color: var(--text-muted); display: block; margin-bottom: 0.5rem;">${icon('PlayCircle', 42)}</span>
              <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.35rem;">Select an Event to Open Exam Controller</h3>
              <p style="color: var(--text-muted); font-size: 0.9rem; max-width: 460px; margin: 0 auto;">
                Control the live event: Start Exam, Send/Next Question, Question Timer, Pause/Resume, and End Exam.
              </p>
            </div>
          `;
        }
        return;
      }

      // Connect to WS and join event room
      wsClient.connect();
      wsClient.joinEventRoom(eventId);

      try {
        const qRes = await apiGetEventQuestions(eventId, 'admin');
        if (qRes.success) {
          examQuestions = qRes.questions;
        }
      } catch (err) {
        console.error('Failed to load exam questions:', err);
      }

      examStatus = ev.status === 'LIVE_NOW' ? 'LOBBY' : ev.status === 'COMPLETED' ? 'EVENT_ENDED' : 'UPCOMING';
      examCurrentQIdx = -1;
      examRemainingSeconds = ev.timerSeconds || 30;
      examTotalSeconds = ev.timerSeconds || 30;
      examIsPaused = false;
      examAnswerCount = 0;
      examCurrentQuestion = examQuestions.length > 0 ? examQuestions[0] : null;

      // Attach WebSocket listeners for live exam control
      examUnsubs = [
        wsClient.on('EVENT_STATE_SNAPSHOT', (snap: any) => {
          if (snap.eventId !== eventId) return;
          examStatus = snap.status;
          examCurrentQIdx = snap.currentQuestionIndex;
          examRemainingSeconds = snap.questionRemainingSeconds ?? 30;
          examCurrentQuestion = snap.question || (examQuestions[examCurrentQIdx] ?? null);
          if (snap.isPaused !== undefined) examIsPaused = snap.isPaused;
          renderExamViewport();
        }),

        wsClient.on('QUESTION_SENT', (data: any) => {
          if (data.eventId !== eventId) return;
          examStatus = 'QUESTION_ACTIVE';
          examCurrentQIdx = data.questionIndex;
          examCurrentQuestion = data.question;
          examTotalSeconds = data.question?.timerSeconds || 30;
          examRemainingSeconds = examTotalSeconds;
          examIsPaused = false;
          examAnswerCount = 0;
          addExamLog(`Question ${data.questionIndex + 1} sent to all registered participants!`, 'success');
          renderExamViewport();
        }),

        wsClient.on('QUESTION_TIMER_STARTED', (data: any) => {
          if (data.eventId !== eventId) return;
          examRemainingSeconds = data.remainingSeconds;
          const timerElem = container.querySelector('#exam-live-countdown-text');
          if (timerElem) timerElem.textContent = `${examRemainingSeconds}s`;
          const timerBar = container.querySelector<HTMLElement>('#exam-timer-progress-fill');
          if (timerBar && examTotalSeconds > 0) {
            const pct = Math.max(0, Math.min(100, (examRemainingSeconds / examTotalSeconds) * 100));
            timerBar.style.width = `${pct}%`;
          }
        }),

        wsClient.on('EVENT_PAUSED', (data: any) => {
          if (data.eventId !== eventId) return;
          examIsPaused = true;
          examRemainingSeconds = data.remainingSeconds;
          addExamLog(`Question timer PAUSED at ${data.remainingSeconds}s remaining.`, 'warn');
          renderExamViewport();
        }),

        wsClient.on('EVENT_RESUMED', (data: any) => {
          if (data.eventId !== eventId) return;
          examIsPaused = false;
          addExamLog(`Question timer RESUMED.`, 'info');
          renderExamViewport();
        }),

        wsClient.on('ADMIN_SCORE_UPDATED', (data: any) => {
          if (data.eventId === eventId) {
            examAnswerCount = data.answersSubmittedCount ?? (examAnswerCount + 1);
            const cntElem = container.querySelector('#exam-answers-submitted-badge');
            if (cntElem) cntElem.textContent = `${examAnswerCount} answers submitted this round`;
            const name = data.participantName || data.userName || 'Participant';
            const pts = data.pointsAwarded !== undefined ? `(+${data.pointsAwarded} pts)` : (data.pointsEarned ? `(+${data.pointsEarned} pts)` : '');
            addExamLog(`Participant ${name} submitted answer ${pts}`, data.isCorrect ? 'success' : 'warn');
          }
        }),

        wsClient.on('ADMIN_QUESTION_REVIEW', (data: any) => {
          if (data.eventId === eventId) {
            addExamLog(`Question review: Timer concluded. Ready to broadcast next question.`, 'info');
          }
        }),

        wsClient.on('QUESTION_ENDED', (data: any) => {
          if (data.eventId !== eventId) return;
          examStatus = 'QUESTION_ENDED';
          addExamLog(`Question ${examCurrentQIdx + 1} ended (Time's up). Ready for next question.`, 'info');
          renderExamViewport();
        }),

        wsClient.on('EVENT_ENDED', (data: any) => {
          if (data.eventId !== eventId) return;
          examStatus = 'EVENT_ENDED';
          ev.status = 'COMPLETED';
          addExamLog(`Event concluded! Final standings generated.`, 'success');
          renderExamViewport();
        })
      ];

      renderExamViewport();
    };

    const renderExamViewport = () => {
      if (!examViewport) return;
      const ev = allEvents.find(e => e.id === examSelectedEventId);
      if (!ev) return;

      const isLive = examStatus === 'LOBBY' || examStatus === 'EVENT_STARTED_WAITING_QUESTION' || examStatus === 'QUESTION_ACTIVE' || examStatus === 'QUESTION_ENDED';
      const isExamActive = examStatus === 'QUESTION_ACTIVE';
      const isEnded = examStatus === 'EVENT_ENDED' || ev.status === 'COMPLETED';

      // Update header tags
      if (examTagsContainer) {
        examTagsContainer.innerHTML = `
          ${isLive ? `<span class="event-status-chip live"><span class="pulse-dot"></span> LIVE NOW</span>` : isEnded ? `<span class="event-status-chip ended">COMPLETED</span>` : `<span class="event-status-chip upcoming">UPCOMING</span>`}
          <span class="admin-event-reg-count">${ev.registrationCount || 0} Registered</span>
          <span class="event-domain-tag">${escapeHtml(ev.domain || 'Engineering')}</span>
        `;
      }

      examViewport.innerHTML = `
        <!-- Main Controller Actions Panel -->
        <div class="exam-console-box" style="margin-bottom: 1.5rem;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
            <div>
              <span style="font-size: 0.75rem; font-weight: 800; color: #6366f1; text-transform: uppercase; letter-spacing: 0.08em; display: flex; align-items: center; gap: 0.35rem;">
                ${icon('Radio', 13)} LIVE EXAM CONTROLLER
              </span>
              <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--text-main); margin: 0.2rem 0;">
                ${escapeHtml(ev.title)}
              </h2>
              <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <span style="font-size: 0.85rem; color: var(--text-muted);">
                  ${examQuestions.length} Questions Configured
                </span>
                <span style="color: var(--text-muted);">•</span>
                <span id="exam-answers-submitted-badge" style="font-size: 0.85rem; font-weight: 700; color: #16a34a;">
                  ${examAnswerCount} answers submitted this round
                </span>
                ${examIsPaused ? `
                  <span style="background: #fef3c7; color: #b45309; border: 1px solid #fde68a; border-radius: 9999px; padding: 0.15rem 0.55rem; font-size: 0.75rem; font-weight: 700;">
                    ${icon('PauseCircle', 12)} TIMER PAUSED
                  </span>
                ` : ''}
              </div>
            </div>

            <!-- Exam Control Toolbar -->
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              ${(!isLive && !isEnded) ? `
                <button id="btn-exam-start-event" class="btn btn-pill" style="background: linear-gradient(135deg, #16a34a, #22c55e); color: #ffffff; font-weight: 700;">
                  <span>${icon('Play', 14)} Start Event</span>
                </button>
              ` : ''}

              ${(examStatus === 'LOBBY' || examStatus === 'EVENT_STARTED_WAITING_QUESTION') ? `
                <button id="btn-exam-send-first" class="btn btn-primary btn-pill" style="font-weight: 700;">
                  <span>${icon('Send', 14)} Send Question 1</span>
                </button>
              ` : ''}

              ${(isExamActive && !examIsPaused) ? `
                <button id="btn-exam-pause-timer" class="btn btn-secondary btn-pill" style="border-color: #fbbf24; color: #b45309; font-weight: 700;">
                  <span>${icon('PauseCircle', 14)} Pause Timer</span>
                </button>
              ` : ''}

              ${(isExamActive && examIsPaused) ? `
                <button id="btn-exam-resume-timer" class="btn btn-pill" style="background: linear-gradient(135deg, #059669, #10b981); color: white; font-weight: 700;">
                  <span>${icon('PlayCircle', 14)} Resume Timer</span>
                </button>
              ` : ''}

              ${(isExamActive || examStatus === 'QUESTION_ENDED') ? `
                <button id="btn-exam-next-question" class="btn btn-primary btn-pill" style="font-weight: 700;">
                  <span>${icon('SkipForward', 14)} Send Next Question</span>
                </button>
              ` : ''}

              ${(!isEnded && (isLive || examStatus === 'UPCOMING')) ? `
                <button id="btn-exam-end-event" class="btn btn-pill" style="background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; font-weight: 700;">
                  <span>${icon('StopCircle', 14)} End Exam</span>
                </button>
              ` : ''}

              <button id="btn-exam-launch-host-console" class="btn btn-secondary btn-pill" style="font-weight: 700;" title="Open Synchronized Host Controller">
                <span>${icon('Trophy', 14)} Host Console</span>
              </button>

              ${isEnded ? `
                <button id="btn-exam-view-scoreboard" class="btn btn-primary btn-pill" style="font-weight: 700;">
                  <span>${icon('Award', 14)} View Final Scoreboard</span>
                </button>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- 2-Column Grid: Question Stage & Live Log -->
        <div style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 1.5rem; align-items: start;">
          <!-- Left: Live Question Stage & Synchronized Countdown -->
          <div class="admin-card" style="padding: 1.75rem; border-radius: var(--radius-xl); background: #ffffff; border: 1.5px solid var(--border-card);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem;">
              <span class="modal-badge-chip" style="color: #4338ca;">
                ${icon('HelpCircle', 14)} QUESTION STAGE
              </span>
              <span style="font-weight: 700; font-size: 0.88rem; color: var(--text-secondary);">
                ${examCurrentQIdx >= 0 ? `Question ${examCurrentQIdx + 1} of ${examQuestions.length}` : 'Lobby / Standby'}
              </span>
            </div>

            <!-- Digital Countdown Bar -->
            <div style="background: #f8fafc; border-radius: var(--radius-lg); padding: 1.25rem; margin-bottom: 1.5rem; border: 1px solid var(--border-card); text-align: center;">
              <span style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 0.25rem;">
                SYNCHRONIZED QUESTION TIMER
              </span>
              <div class="exam-timer-display" id="exam-live-countdown-text" style="font-size: 2.5rem; font-weight: 900; color: ${examRemainingSeconds <= 5 ? '#dc2626' : '#4338ca'};">
                ${examRemainingSeconds}s
              </div>
              <div style="height: 6px; background: #e2e8f0; border-radius: 9999px; overflow: hidden; margin-top: 0.75rem;">
                <div id="exam-timer-progress-fill" style="height: 100%; width: 100%; background: linear-gradient(90deg, #4f46e5, #06b6d4); transition: width 1s linear;"></div>
              </div>
            </div>

            ${examCurrentQuestion ? `
              <div style="margin-bottom: 1.5rem;">
                <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--text-main); line-height: 1.45; margin-bottom: 1rem;">
                  ${escapeHtml(examCurrentQuestion.questionText)}
                </h3>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                  ${examCurrentQuestion.options.map((opt, oIdx) => {
        const isCorrect = oIdx === (examCurrentQuestion?.correctOption ?? 0);
        return `
                      <div style="background: ${isCorrect ? '#f0fdf4' : '#f8fafc'}; border: 1.5px solid ${isCorrect ? '#86efac' : 'var(--border-card)'}; border-radius: var(--radius-md); padding: 0.75rem 1rem; display: flex; align-items: center; justify-content: space-between;">
                        <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-main);">
                          <strong style="color: ${isCorrect ? '#15803d' : '#64748b'};">${String.fromCharCode(65 + oIdx)}:</strong> ${escapeHtml(opt)}
                        </span>
                        ${isCorrect ? `<span style="color: #15803d; font-weight: 700; font-size: 0.75rem; display: flex; align-items: center; gap: 0.2rem;">${icon('Check', 12)} Correct</span>` : ''}
                      </div>
                    `;
      }).join('')}
                </div>
              </div>
            ` : `
              <div style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                <p>No question is currently live. Click "Send Question 1" or "Send Next Question" above to push questions to all participants.</p>
              </div>
            `}
          </div>

          <!-- Right: Live Activity Log Stream -->
          <div class="admin-card" style="padding: 1.75rem; border-radius: var(--radius-xl); background: #ffffff; border: 1.5px solid var(--border-card);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem;">
              <span class="modal-badge-chip" style="color: #16a34a;">
                ${icon('Activity', 14)} REAL-TIME EVENT STREAM
              </span>
              <button id="btn-exam-goto-scoreboard" class="btn btn-secondary btn-pill-sm" style="font-size: 0.76rem; padding: 0.25rem 0.6rem;">
                ${icon('Award', 12)} Live Scoreboard
              </button>
            </div>

            <div class="exam-live-feed" id="exam-activity-log-feed" style="max-height: 420px; overflow-y: auto;">
              <!-- Dynamic real-time logs -->
            </div>
          </div>
        </div>
      `;

      renderExamLogs();

      // Wire Action Buttons
      container.querySelector('#btn-exam-start-event')?.addEventListener('click', () => {
        soundEngine.playClick();
        wsClient.send('ADMIN_START_EVENT', { eventId: examSelectedEventId });
        showToast('Exam lobby opened! Live countdown active.', 'success');
        addExamLog('Exam lobby opened by administrator.', 'success');
      });

      container.querySelector('#btn-exam-send-first')?.addEventListener('click', () => {
        soundEngine.playClick();
        wsClient.send('ADMIN_SEND_QUESTION', { eventId: examSelectedEventId, questionIndex: 0 });
        showToast('Sending Question 1...', 'info');
      });

      container.querySelector('#btn-exam-next-question')?.addEventListener('click', () => {
        soundEngine.playClick();
        wsClient.send('ADMIN_NEXT_QUESTION', { eventId: examSelectedEventId });
        showToast('Advancing to next question...', 'info');
      });

      container.querySelector('#btn-exam-pause-timer')?.addEventListener('click', () => {
        soundEngine.playClick();
        wsClient.send('ADMIN_PAUSE_TIMER', { eventId: examSelectedEventId });
        showToast('Question timer paused.', 'info');
      });

      container.querySelector('#btn-exam-resume-timer')?.addEventListener('click', () => {
        soundEngine.playClick();
        wsClient.send('ADMIN_RESUME_TIMER', { eventId: examSelectedEventId });
        showToast('Question timer resumed.', 'success');
      });

      container.querySelector('#btn-exam-end-event')?.addEventListener('click', () => {
        soundEngine.playClick();
        if (!confirm('Are you sure you want to end this exam and finalize results?')) return;
        wsClient.send('ADMIN_END_EVENT', { eventId: examSelectedEventId });
        showToast('Exam ended! Results finalized.', 'success');
      });

      container.querySelector('#btn-exam-launch-host-console')?.addEventListener('click', () => {
        soundEngine.playClick();
        openHostConsole(examSelectedEventId);
      });

      container.querySelector('#btn-exam-view-scoreboard')?.addEventListener('click', () => {
        soundEngine.playClick();
        switchTab('event-scoreboard', examSelectedEventId);
      });

      container.querySelector('#btn-exam-goto-scoreboard')?.addEventListener('click', () => {
        soundEngine.playClick();
        switchTab('event-scoreboard', examSelectedEventId);
      });
    };

    examEventSelector.onchange = () => {
      soundEngine.playClick();
      setupExamController(examEventSelector.value);
    };

    if (examSelectedEventId) {
      await setupExamController(examSelectedEventId);
    }
  }

  // =========================================================================
  // MODULE 5: EVENT SCOREBOARD (Podium rankings, Live scores & CSV export)
  // =========================================================================
  let sbLeaderboard: LeaderboardEntry[] = [];
  let sbUnsubs: (() => void)[] = [];

  async function initEventScoreboardModule(preselectedEventId?: string) {
    const sbEventSelector = container.querySelector<HTMLSelectElement>('#sb-event-selector');
    const sbStatusPill = container.querySelector<HTMLElement>('#sb-event-status-pill');
    const sbViewport = container.querySelector<HTMLElement>('#sb-content-viewport');
    const btnExportCsv = container.querySelector<HTMLButtonElement>('#btn-export-scoreboard-csv');
    const sbBadge = container.querySelector<HTMLElement>('#sb-event-badge');

    if (!sbEventSelector) return;

    if (preselectedEventId) {
      sbSelectedEventId = preselectedEventId;
    } else if (!sbSelectedEventId && allEvents.length > 0) {
      sbSelectedEventId = allEvents[0].id;
    }

    sbEventSelector.innerHTML = `
      <option value="">-- Choose an Event to View Scoreboard --</option>
      ${allEvents.map(e => `
        <option value="${e.id}" ${e.id === sbSelectedEventId ? 'selected' : ''}>
          ${escapeHtml(e.title)} (${e.domain || 'Engineering'}) — [${e.status}]
        </option>
      `).join('')}
    `;

    const filterContestants = (list: LeaderboardEntry[]): LeaderboardEntry[] => {
      return (list || []).filter(e => {
        const uid = String(e.userId || '');
        const uname = String(e.userName || '').toLowerCase();
        if (uid.startsWith('adm_') || uid === 'usr_saicharan_super' || uname.includes('sai charan') || uname.includes('admin')) {
          return false;
        }
        return true;
      });
    };

    const setupScoreboard = async (eventId: string) => {
      sbSelectedEventId = eventId;
      sbUnsubs.forEach(u => u());
      sbUnsubs = [];
      sbLeaderboard = []; // Clear immediately to prevent cross-event contamination

      const ev = allEvents.find(e => e.id === eventId);
      if (!eventId || !ev) {
        if (sbStatusPill) sbStatusPill.innerHTML = '';
        if (sbBadge) sbBadge.textContent = 'Scoreboard';
        if (sbViewport) {
          sbViewport.innerHTML = `
            <div style="text-align: center; padding: 4rem 2rem; background: #ffffff; border-radius: var(--radius-xl); border: 1.5px solid var(--border-card);">
              <span style="color: var(--text-muted); display: block; margin-bottom: 0.5rem;">${icon('Award', 42)}</span>
              <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.35rem;">Select an Event to Display Scoreboard</h3>
              <p style="color: var(--text-muted); font-size: 0.9rem; max-width: 460px; margin: 0 auto;">
                View live synchronized rankings, points, and final competition standings.
              </p>
            </div>
          `;
        }
        return;
      }

      if (sbBadge) sbBadge.textContent = `${ev.title} Scoreboard`;
      renderScoreboard(); // Render immediately with cleared data

      // Connect to WS room for real-time live updates
      wsClient.connect();
      wsClient.joinEventRoom(eventId);

      try {
        const leadRes = await apiGetEventLeaderboard(eventId);
        if (leadRes.success) {
          sbLeaderboard = filterContestants(leadRes.leaderboard || []);
        }
      } catch (err) {
        console.error('Failed to load leaderboard:', err);
      }

      sbUnsubs = [
        wsClient.on('LEADERBOARD_UPDATED', (data: any) => {
          if (data.eventId !== eventId) return;
          sbLeaderboard = filterContestants(data.leaderboard || []);
          renderScoreboard();
        }),
        wsClient.on('ADMIN_SCORE_UPDATED', (data: any) => {
          if (data.eventId === eventId && data.leaderboard) {
            sbLeaderboard = filterContestants(data.leaderboard);
            renderScoreboard();
          }
        }),
        wsClient.on('ADMIN_QUESTION_REVIEW', (data: any) => {
          if (data.eventId === eventId && data.leaderboard) {
            sbLeaderboard = filterContestants(data.leaderboard);
            renderScoreboard();
          }
        }),
        wsClient.on('ADMIN_EVENT_CONCLUDED', (data: any) => {
          if (data.eventId === eventId && data.leaderboard) {
            sbLeaderboard = filterContestants(data.leaderboard);
            renderScoreboard();
          }
        }),
        wsClient.on('SCORE_UPDATED', () => {
          renderScoreboard();
        }),
        wsClient.on('EVENT_ENDED', (data: any) => {
          if (data.eventId !== eventId) return;
          if (data.leaderboard) sbLeaderboard = filterContestants(data.leaderboard);
          ev.status = 'COMPLETED';
          renderScoreboard();
        }),
        wsClient.on('EVENT_STATE_SNAPSHOT', (snap: any) => {
          if (snap.eventId !== eventId) return;
          if (snap.leaderboard) sbLeaderboard = filterContestants(snap.leaderboard);
          renderScoreboard();
        })
      ];

      renderScoreboard();
    };

    const renderScoreboard = () => {
      if (!sbViewport) return;
      const ev = allEvents.find(e => e.id === sbSelectedEventId);
      if (!ev) return;

      const isLive = ev.status === 'LIVE_NOW' || ev.status === 'LOBBY' || ev.status === 'QUESTION_ACTIVE';
      const isCompleted = ev.status === 'COMPLETED';

      if (sbStatusPill) {
        sbStatusPill.innerHTML = isLive
          ? `<span class="event-status-chip live"><span class="pulse-dot"></span> LIVE SYNCHRONIZED</span>`
          : isCompleted
            ? `<span class="event-status-chip ended">FINAL OFFICIAL RESULTS</span>`
            : `<span class="event-status-chip upcoming">UPCOMING</span>`;
      }

      const renderPodiumHtml = (): string => {
        if (sbLeaderboard.length === 0) {
          return '';
        }

        if (sbLeaderboard.length === 1) {
          const p1 = sbLeaderboard[0];
          return `
            <!-- Single Champion Showcase (Only 1 Participant Ranked) -->
            <div style="display: flex; justify-content: center; margin-bottom: 2rem;">
              <div class="podium-card podium-gold" style="max-width: 440px; width: 100%; border: 2px solid #fde047; box-shadow: 0 10px 25px -5px rgba(234, 179, 8, 0.2);">
                <span class="podium-rank-badge rank-1">${icon('Crown', 15)} 1st Place Champion</span>
                <div style="margin: 0.85rem 0;">
                  ${renderAlphabetAvatar(p1.userName, 'table-avatar-md')}
                </div>
                <strong class="podium-name" style="font-size: 1.15rem;">${escapeHtml(p1.userName)}</strong>
                <span class="podium-score" style="font-size: 1.6rem; color: #4338ca;">${p1.score} XP</span>
                <span class="podium-correct" style="color: #15803d; font-weight: 700;">${p1.correctCount} Correct (${p1.totalTimeSeconds ? p1.totalTimeSeconds.toFixed(1) + 's' : '0.0s'})</span>
              </div>
            </div>
          `;
        }

        if (sbLeaderboard.length === 2) {
          const p1 = sbLeaderboard[0];
          const p2 = sbLeaderboard[1];
          return `
            <!-- Top 2 Duel Podium (Only 2 Participants Ranked) -->
            <div class="sb-podium-grid" style="grid-template-columns: repeat(2, minmax(240px, 360px)); justify-content: center; max-width: 760px; margin: 0 auto 2rem; gap: 1.5rem;">
              <!-- 1st Place Gold -->
              <div class="podium-card podium-gold">
                <span class="podium-rank-badge rank-1">${icon('Crown', 15)} 1st Place Champion</span>
                <div style="margin: 0.75rem 0;">
                  ${renderAlphabetAvatar(p1.userName, 'table-avatar-md')}
                </div>
                <strong class="podium-name">${escapeHtml(p1.userName)}</strong>
                <span class="podium-score" style="font-size: 1.5rem;">${p1.score} XP</span>
                <span class="podium-correct">${p1.correctCount} Correct</span>
              </div>

              <!-- 2nd Place Silver -->
              <div class="podium-card podium-silver">
                <span class="podium-rank-badge rank-2">${icon('Medal', 14)} 2nd Place</span>
                <div style="margin: 0.75rem 0;">
                  ${renderAlphabetAvatar(p2.userName, 'table-avatar-md')}
                </div>
                <strong class="podium-name">${escapeHtml(p2.userName)}</strong>
                <span class="podium-score">${p2.score} XP</span>
                <span class="podium-correct">${p2.correctCount} Correct</span>
              </div>
            </div>
          `;
        }

        // 3 or more participants
        const p1 = sbLeaderboard[0];
        const p2 = sbLeaderboard[1];
        const p3 = sbLeaderboard[2];
        return `
          <!-- Top 3 Podium Cards -->
          <div class="sb-podium-grid" style="margin-bottom: 2rem;">
            <!-- 2nd Place Silver -->
            <div class="podium-card podium-silver">
              <span class="podium-rank-badge rank-2">${icon('Medal', 14)} 2nd Place</span>
              <div style="margin: 0.75rem 0;">
                ${renderAlphabetAvatar(p2.userName, 'table-avatar-md')}
              </div>
              <strong class="podium-name">${escapeHtml(p2.userName)}</strong>
              <span class="podium-score">${p2.score} XP</span>
              <span class="podium-correct">${p2.correctCount} Correct</span>
            </div>

            <!-- 1st Place Gold (Champion) -->
            <div class="podium-card podium-gold">
              <span class="podium-rank-badge rank-1">${icon('Crown', 15)} 1st Place Champion</span>
              <div style="margin: 0.75rem 0;">
                ${renderAlphabetAvatar(p1.userName, 'table-avatar-md')}
              </div>
              <strong class="podium-name">${escapeHtml(p1.userName)}</strong>
              <span class="podium-score" style="font-size: 1.5rem;">${p1.score} XP</span>
              <span class="podium-correct">${p1.correctCount} Correct</span>
            </div>

            <!-- 3rd Place Bronze -->
            <div class="podium-card podium-bronze">
              <span class="podium-rank-badge rank-3">${icon('Award', 14)} 3rd Place</span>
              <div style="margin: 0.75rem 0;">
                ${renderAlphabetAvatar(p3.userName, 'table-avatar-md')}
              </div>
              <strong class="podium-name">${escapeHtml(p3.userName)}</strong>
              <span class="podium-score">${p3.score} XP</span>
              <span class="podium-correct">${p3.correctCount} Correct</span>
            </div>
          </div>
        `;
      };

      sbViewport.innerHTML = `
        ${renderPodiumHtml()}

        <!-- Full Ranked Standings Table -->
        <div class="admin-table-container">
          <div class="table-responsive">
            <table class="admin-users-table">
              <thead>
                <tr>
                  <th style="width: 10%;">Rank</th>
                  <th style="width: 40%;">Participant</th>
                  <th style="width: 18%; text-align: right;">Total Score</th>
                  <th style="width: 16%; text-align: right;">Correct Answers</th>
                  <th style="width: 16%; text-align: right;">Time Elapsed</th>
                </tr>
              </thead>
              <tbody>
                ${sbLeaderboard.length === 0 ? `
                  <tr>
                    <td colspan="5" style="text-align: center; padding: 3rem 2rem; color: var(--text-muted);">
                      No participant submissions recorded yet. Rankings will populate live as answers are submitted.
                    </td>
                  </tr>
                ` : sbLeaderboard.map(entry => `
                  <tr>
                    <td>
                      <span class="lead-rank-badge ${entry.rank === 1 ? 'lead-rank-1' : entry.rank === 2 ? 'lead-rank-2' : entry.rank === 3 ? 'lead-rank-3' : ''}">
                        ${entry.rank}
                      </span>
                    </td>
                    <td>
                      <div style="display: flex; align-items: center; gap: 0.65rem;">
                        ${renderAlphabetAvatar(entry.userName, 'table-avatar-sm')}
                        <strong style="color: var(--text-main); font-size: 0.92rem;">${escapeHtml(entry.userName)}</strong>
                      </div>
                    </td>
                    <td style="text-align: right; font-weight: 800; color: #4338ca; font-size: 1rem;">
                      ${entry.score} XP
                    </td>
                    <td style="text-align: right; font-weight: 700; color: #16a34a; font-size: 0.92rem;">
                      ${entry.correctCount}
                    </td>
                    <td style="text-align: right; font-weight: 600; color: var(--text-muted); font-size: 0.88rem;">
                      ${entry.totalTimeSeconds ? entry.totalTimeSeconds.toFixed(1) + 's' : '0.0s'}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="admin-table-footer">
            <span class="admin-table-count-text">${sbLeaderboard.length} Ranked Engineers</span>
            <span class="admin-quick-legend">${icon('Award', 14)} Scores computed by correct answers and response speed.</span>
          </div>
        </div>
      `;
    };

    sbEventSelector.onchange = () => {
      soundEngine.playClick();
      setupScoreboard(sbEventSelector.value);
    };

    if (btnExportCsv) {
      btnExportCsv.onclick = () => {
        soundEngine.playClick();
        if (sbLeaderboard.length === 0) {
          showToast('No scoreboard data to export.', 'info');
          return;
        }
        const ev = allEvents.find(e => e.id === sbSelectedEventId);
        const headers = ['Rank', 'Participant Name', 'Total Score (XP)', 'Correct Count', 'Time Elapsed (s)'];
        const rows = sbLeaderboard.map(entry => [
          entry.rank,
          `"${entry.userName.replace(/"/g, '""')}"`,
          entry.score,
          entry.correctCount,
          entry.totalTimeSeconds ? entry.totalTimeSeconds.toFixed(1) : 0
        ]);
        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `scoreboard_${(ev?.title || 'event').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Scoreboard CSV exported successfully!', 'success');
      };
    }

    if (sbSelectedEventId) {
      await setupScoreboard(sbSelectedEventId);
    }
  }

  loadAllData();
}

function getBranchClass(branch: string): string {
  if (!branch) return 'branch-default';
  const b = branch.toLowerCase();
  if (b.includes('computer') || b.includes('cse')) return 'branch-cse';
  if (b.includes('ai') || b.includes('data')) return 'branch-ai';
  if (b.includes('electron') || b.includes('ece')) return 'branch-ece';
  if (b.includes('mech')) return 'branch-mech';
  if (b.includes('civil')) return 'branch-civil';
  if (b.includes('aero')) return 'branch-aero';
  if (b.includes('it') || b.includes('inform')) return 'branch-it';
  return 'branch-default';
}

function getAdminRoleClass(role: string): string {
  return role === 'SUPERADMIN' ? 'role-super' : 'role-admin';
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString();
  } catch {
    return dateStr;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const ALPHABET_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  A: { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' },
  B: { bg: '#ede9fe', text: '#6d28d9', border: '#ddd6fe' },
  C: { bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
  D: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
  E: { bg: '#fdf2f8', text: '#be185d', border: '#fbcfe8' },
  F: { bg: '#f0fdfa', text: '#0f766e', border: '#99f6e4' },
  G: { bg: '#eef2ff', text: '#4338ca', border: '#c7d2fe' },
  H: { bg: '#fff1f2', text: '#be123c', border: '#fecdd3' },
  I: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  J: { bg: '#faf5ff', text: '#7e22ce', border: '#e9d5ff' },
  K: { bg: '#fefce8', text: '#a16207', border: '#fef08a' },
  L: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  M: { bg: '#fff7ed', text: '#c2410c', border: '#ffedd5' },
  N: { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1' },
  O: { bg: '#e0e7ff', text: '#4338ca', border: '#c7d2fe' },
  P: { bg: '#fdf2f8', text: '#be185d', border: '#fbcfe8' },
  Q: { bg: '#faf5ff', text: '#7e22ce', border: '#e9d5ff' },
  R: { bg: '#fff1f2', text: '#be123c', border: '#fecdd3' },
  S: { bg: '#e0e7ff', text: '#3730a3', border: '#c7d2fe' },
  T: { bg: '#f0fdfa', text: '#0f766e', border: '#99f6e4' },
  U: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  V: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
  W: { bg: '#fff7ed', text: '#c2410c', border: '#ffedd5' },
  X: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
  Y: { bg: '#fefce8', text: '#a16207', border: '#fef08a' },
  Z: { bg: '#faf5ff', text: '#6b21a8', border: '#e9d5ff' }
};

function renderAlphabetAvatar(name: string, extraClass: string = ''): string {
  const letter = (name ? name.trim().charAt(0) : 'E').toUpperCase();
  const c = ALPHABET_COLORS[letter] || { bg: '#e0e7ff', text: '#4338ca', border: '#c7d2fe' };
  return `<div class="alphabet-avatar ${extraClass}" style="background-color: ${c.bg}; color: ${c.text}; border: 1.5px solid ${c.border};" aria-label="${escapeHtml(name)}">${letter}</div>`;
}
