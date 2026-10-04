import { icon } from '../components/Icons.ts';
import { soundEngine } from '../components/AudioEffects.ts';
import { getLoggedInUser, clearUserSession } from '../auth.ts';
import { showToast } from '../components/Toast.ts';

export function renderParticipantPortalView(
  container: HTMLElement,
  onNavigate: (view: string, params?: any) => void
): void {
  const user = getLoggedInUser() || {
    id: 'usr_guest',
    name: 'Engineer Guest',
    email: 'guest@engiverse.io',
    branch: 'Computer Systems',
    year: '4th Year',
    streak: 1,
    xp: 250,
    badge: 'Engineer'
  };

  const isSuperadmin = Boolean(
    (user as any).role === 'SUPERADMIN' ||
    user.badge?.toLowerCase().includes('superadmin') ||
    user.badge?.toLowerCase().includes('admin') ||
    sessionStorage.getItem('engiverse_admin_token')
  );

  const initialLetter = (user.name ? user.name.trim().charAt(0) : 'E').toUpperCase();

  container.innerHTML = `
    <div class="portal-viewport">
      <!-- Portal Topbar Header -->
      <header class="portal-header">
        <div class="portal-header-inner">
          <div class="portal-brand">
            <span class="portal-brand-icon">${icon('Zap', 22)}</span>
            <div class="portal-brand-text">
              <span class="portal-brand-title">Engiverse</span>
              <span class="portal-brand-subtitle">ENGINEERING PORTAL</span>
            </div>
          </div>

          <div class="portal-user-actions">
            <!-- Streak pill -->
            <div class="portal-stat-pill streak-pill" title="Daily streak active">
              <span class="pill-icon" style="color: #ea580c;">${icon('Flame', 14)}</span>
              <span class="pill-val">${user.streak || 1} Day Streak</span>
            </div>

            <!-- XP pill -->
            <div class="portal-stat-pill xp-pill" title="Total accumulated XP">
              <span class="pill-icon" style="color: #4f46e5;">${icon('Zap', 14)}</span>
              <span class="pill-val">${(user.xp || 250).toLocaleString()} XP</span>
            </div>

            <!-- Profile Badge -->
            <div class="portal-profile-chip">
              <div class="portal-avatar">${initialLetter}</div>
              <div class="portal-profile-info">
                <span class="portal-user-name">${escapeHtml(user.name)}</span>
                <span class="portal-user-role">${escapeHtml(user.branch || 'Engineering')}</span>
              </div>
            </div>

            ${isSuperadmin ? `
              <button id="btn-portal-goto-admin" class="btn btn-secondary btn-pill" title="Access Administrator Console">
                <span>${icon('Shield', 14)} Admin Console</span>
              </button>
            ` : ''}

            <button id="btn-portal-logout" class="btn-portal-logout" title="Sign out of portal">
              ${icon('LogOut', 15)}
            </button>
          </div>
        </div>
      </header>

      <!-- Portal Hero Welcome -->
      <main class="portal-main-content">
        <div class="portal-welcome-banner">
          <div class="portal-welcome-pill">${icon('Sparkles', 13)} ENGIVERSE ARENA</div>
          <h1 class="portal-main-heading">Welcome, ${escapeHtml(user.name.split(' ')[0])}</h1>
          <p class="portal-subheading">
            Choose your learning and competitive mode below. Solve self-paced daily quizzes or compete in synchronized live events.
          </p>
        </div>

        <!-- EXACTLY 2 OPTIONS CARDS -->
        <div class="portal-dual-grid">
          <!-- OPTION 1: DAILY QUIZ -->
          <div class="portal-choice-card daily-quiz-card" id="card-option-daily-quiz">
            <div class="card-glow-indicator glow-indigo"></div>
            <div class="card-header-badge">
              <span class="chip-dot dot-indigo"></span>
              <span>DAILY PRACTICE • SOLO ARENA</span>
            </div>
            <div class="card-icon-wrapper icon-indigo">
              ${icon('BookOpen', 38)}
            </div>
            <h2 class="card-title">Daily Quiz</h2>
            <p class="card-desc">
              Sharpen your core engineering intuition with curated domain challenges in Computer Architecture, AI & ML, VLSI, and Robotics. Maintain your daily streak and earn persistent XP.
            </p>
            <div class="card-highlights">
              <div class="highlight-item">
                <span class="hi-icon">${icon('CheckCircle2', 14)}</span>
                <span>Self-Paced with Automatic Scoring</span>
              </div>
              <div class="highlight-item">
                <span class="hi-icon">${icon('Flame', 14)}</span>
                <span>Boost Daily Streak & Personal XP</span>
              </div>
              <div class="highlight-item">
                <span class="hi-icon">${icon('Layers', 14)}</span>
                <span>Stored Separately from Event Records</span>
              </div>
            </div>
            <button id="btn-launch-daily-quiz" class="btn btn-primary btn-portal-action">
              <span>Start Daily Quiz</span>
              ${icon('ArrowRight', 16)}
            </button>
          </div>

          <!-- OPTION 2: EVENTS -->
          <div class="portal-choice-card events-card" id="card-option-events">
            <div class="card-glow-indicator glow-purple"></div>
            <div class="card-header-badge">
              <span class="chip-dot dot-purple"></span>
              <span>LIVE COMPETITIONS • REAL-TIME</span>
            </div>
            <div class="card-icon-wrapper icon-purple">
              ${icon('Trophy', 38)}
            </div>
            <h2 class="card-title">Events</h2>
            <p class="card-desc">
              Enter scheduled multiplayer engineering competitions. Synchronized question broadcasts, live countdown timers, and real-time national ranking updates with zero page refreshes.
            </p>
            <div class="card-highlights">
              <div class="highlight-item">
                <span class="hi-icon">${icon('Radio', 14)}</span>
                <span>Host-Controlled Live Question Flow</span>
              </div>
              <div class="highlight-item">
                <span class="hi-icon">${icon('Users', 14)}</span>
                <span>Instant 1-Click Real-Time Registration</span>
              </div>
              <div class="highlight-item">
                <span class="hi-icon">${icon('Award', 14)}</span>
                <span>Live Synchronized Dynamic Leaderboard</span>
              </div>
            </div>
            <button id="btn-browse-events" class="btn btn-primary btn-portal-action btn-gradient-purple">
              <span>Explore & Join Events</span>
              ${icon('ArrowRight', 16)}
            </button>
          </div>
        </div>

        <!-- Quick Summary Bar -->
        <div class="portal-bottom-summary">
          <div class="summary-col">
            <span class="summary-label">${icon('Calendar', 13)} Today's Date</span>
            <span class="summary-val">${new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
          <div class="summary-divider"></div>
          <div class="summary-col">
            <span class="summary-label">${icon('Activity', 13)} Real-Time System Status</span>
            <span class="summary-val" style="color: #16a34a; font-weight: 700;">● WebSocket Server Live (ws://)</span>
          </div>
          <div class="summary-divider"></div>
          <div class="summary-col">
            <span class="summary-label">${icon('Database', 13)} Cloud Persistence</span>
            <span class="summary-val">Turso Database Connected</span>
          </div>
        </div>
      </main>
    </div>
  `;

  // Attach Event Listeners
  container.querySelector('#btn-launch-daily-quiz')?.addEventListener('click', () => {
    soundEngine.playClick();
    onNavigate('daily-quiz');
  });

  container.querySelector('#card-option-daily-quiz')?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).tagName !== 'BUTTON') {
      soundEngine.playClick();
      onNavigate('daily-quiz');
    }
  });

  container.querySelector('#btn-browse-events')?.addEventListener('click', () => {
    soundEngine.playClick();
    onNavigate('events');
  });

  container.querySelector('#card-option-events')?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).tagName !== 'BUTTON') {
      soundEngine.playClick();
      onNavigate('events');
    }
  });

  container.querySelector('#btn-portal-goto-admin')?.addEventListener('click', () => {
    soundEngine.playClick();
    onNavigate('admin-dashboard');
  });

  container.querySelector('#btn-portal-logout')?.addEventListener('click', () => {
    soundEngine.playClick();
    clearUserSession();
    showToast('Signed out of participant portal.', 'info');
    onNavigate('login');
  });
}

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
