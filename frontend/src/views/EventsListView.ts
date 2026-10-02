import { icon } from '../components/Icons.ts';
import { soundEngine } from '../components/AudioEffects.ts';
import { getLoggedInUser } from '../auth.ts';
import { showToast } from '../components/Toast.ts';
import { apiGetEvents, apiRegisterForEvent, QuizEvent } from '../api/client.ts';
import { wsClient } from '../services/wsClient.ts';

export function renderEventsListView(
  container: HTMLElement,
  onNavigate: (view: string, params?: any) => void
): void {
  const user = getLoggedInUser() || {
    id: 'usr_guest',
    name: 'Engineer Guest',
    email: 'guest@engiverse.io',
    branch: 'Engineering'
  };

  let events: QuizEvent[] = [];
  let isLoading = true;

  container.innerHTML = `
    <div class="portal-viewport">
      <header class="portal-header">
        <div class="portal-header-inner">
          <button id="btn-events-back-portal" class="btn btn-secondary btn-pill">
            <span>${icon('ArrowLeft', 14)} Back to Portal</span>
          </button>
          <div class="portal-brand">
            <span class="portal-brand-icon" style="color: #7c3aed;">${icon('Trophy', 22)}</span>
            <div class="portal-brand-text">
              <span class="portal-brand-title">Engineering Events</span>
              <span class="portal-brand-subtitle">LIVE COMPETITIONS ARENA</span>
            </div>
          </div>
          <div class="portal-user-actions">
            <div class="portal-stat-pill" style="border-color: #86efac; background: #f0fdf4; color: #16a34a;" id="ws-indicator-pill">
              <span class="pulse-dot"></span>
              <span style="font-weight: 700; font-size: 0.78rem;">Live Sync Active</span>
            </div>
          </div>
        </div>
      </header>

      <main class="portal-main-content">
        <div class="portal-welcome-banner">
          <div class="portal-welcome-pill" style="color: #7c3aed; background: #f5f3ff;">
            ${icon('Radio', 13)} MULTIPLAYER QUIZ COMPETITIONS
          </div>
          <h1 class="portal-main-heading">Active & Upcoming Events</h1>
          <p class="portal-subheading">
            Register for live engineering quizzes. Once registered, enter the live room when the host starts the event. Synchronized questions and live leaderboards update in real time without refreshing.
          </p>
        </div>

        <div id="events-grid-container" class="events-grid">
          <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem;">
            <div class="admin-loading-spinner"></div>
            <span style="color: var(--text-muted); font-size: 0.95rem; margin-top: 0.75rem; display: block;">
              Loading events from Turso DB and connecting live WebSocket...
            </span>
          </div>
        </div>
      </main>
    </div>
  `;

  container.querySelector('#btn-events-back-portal')?.addEventListener('click', () => {
    soundEngine.playClick();
    unsubs.forEach(cleanup => cleanup());
    onNavigate('portal');
  });

  // Load events
  async function loadEvents() {
    try {
      const res = await apiGetEvents(user.id);
      if (res.success) {
        events = res.events;
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      isLoading = false;
      renderEventsGrid();
    }
  }

  function renderEventsGrid() {
    const grid = container.querySelector('#events-grid-container');
    if (!grid) return;

    if (isLoading) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem;">
          <div class="admin-loading-spinner" style="margin: 0 auto 1rem;"></div>
          <span style="color: var(--text-muted); font-size: 0.95rem; display: block;">
            Loading events from Turso DB and connecting live WebSocket...
          </span>
        </div>
      `;
      return;
    }

    if (events.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; background: #ffffff; border-radius: var(--radius-xl); border: 1.5px solid var(--border-card);">
          <span style="color: var(--text-muted); display: block; margin-bottom: 0.5rem;">${icon('Calendar', 36)}</span>
          <h3 style="font-size: 1.15rem; color: var(--text-main); margin-bottom: 0.35rem;">No Events Scheduled</h3>
          <p style="color: var(--text-muted); font-size: 0.88rem; max-width: 420px; margin: 0 auto;">
            New competitive events will appear here in real time when created by administrators.
          </p>
        </div>
      `;
      return;
    }

    grid.innerHTML = events.map(ev => {
      const isLive = ev.status === 'LIVE_NOW' || ev.status === 'LOBBY' || ev.status === 'QUESTION_ACTIVE';
      const isCompleted = ev.status === 'COMPLETED';

      return `
        <div class="event-card ${isLive ? 'event-card-live' : ''}" id="event-card-${ev.id}">
          <div class="event-card-top">
            <span class="event-domain-chip">${icon('Award', 12)} ${escapeHtml(ev.domain)}</span>
            <div class="event-status-pill ${isLive ? 'status-live' : isCompleted ? 'status-completed' : 'status-upcoming'}">
              ${isLive ? `<span class="pulse-dot"></span> LIVE NOW` : isCompleted ? `COMPLETED` : `UPCOMING`}
            </div>
          </div>

          <h3 class="event-title">${escapeHtml(ev.title)}</h3>
          <p class="event-desc">${escapeHtml(ev.description || 'Live engineering championship featuring synchronized multiplayer questions.')}</p>

          <div class="event-meta-stats">
            <div class="meta-stat">
              <span class="stat-icon">${icon('HelpCircle', 13)}</span>
              <span>${ev.questionCount || 5} Questions</span>
            </div>
            <div class="meta-stat">
              <span class="stat-icon">${icon('Clock', 13)}</span>
              <span>${ev.timerSeconds || 30}s / Question</span>
            </div>
            <div class="meta-stat" id="meta-reg-${ev.id}">
              <span class="stat-icon">${icon('Users', 13)}</span>
              <span id="reg-count-${ev.id}">${ev.registrationCount || 0} Registered</span>
            </div>
          </div>

          <div class="event-card-action" id="action-container-${ev.id}">
            ${renderEventAction(ev, isLive, isCompleted)}
          </div>
        </div>
      `;
    }).join('');

    // Attach Action Listeners
    attachActionListeners();
  }

  function renderEventAction(ev: QuizEvent, isLive: boolean, isCompleted: boolean): string {
    if (ev.isRegistered) {
      if (isLive) {
        return `
          <button class="btn btn-primary btn-pill btn-enter-live-quiz" data-id="${ev.id}" style="width: 100%; justify-content: center; background: linear-gradient(135deg, #16a34a 0%, #059669 100%);">
            <span>Enter Live Quiz Room</span>
            ${icon('Radio', 14)}
          </button>
        `;
      } else if (isCompleted) {
        return `
          <button class="btn btn-secondary btn-pill btn-view-leaderboard" data-id="${ev.id}" style="width: 100%; justify-content: center;">
            <span>${icon('Trophy', 14)} View Final Leaderboard</span>
          </button>
        `;
      } else {
        return `
          <div class="registered-confirmed-badge">
            <span class="check-icon">${icon('CheckCircle2', 15)}</span>
            <span>Registered ✓ — Waiting for Host</span>
          </div>
        `;
      }
    } else {
      if (isCompleted) {
        return `
          <button class="btn btn-secondary btn-pill btn-view-leaderboard" data-id="${ev.id}" style="width: 100%; justify-content: center;">
            <span>${icon('Trophy', 14)} View Final Leaderboard</span>
          </button>
        `;
      }
      return `
        <button class="btn btn-primary btn-pill btn-register-now" data-id="${ev.id}" style="width: 100%; justify-content: center;">
          <span>Register for Event</span>
          ${icon('Check', 14)}
        </button>
      `;
    }
  }

  function attachActionListeners() {
    // Register button handler
    container.querySelectorAll('.btn-register-now').forEach(btn => {
      btn.addEventListener('click', async () => {
        soundEngine.playClick();
        const evId = btn.getAttribute('data-id');
        if (!evId) return;

        (btn as HTMLButtonElement).disabled = true;
        btn.innerHTML = `<span>Registering...</span>`;

        try {
          const res = await apiRegisterForEvent(evId, {
            userId: user.id || 'usr_guest',
            userName: user.name,
            userEmail: user.email
          });

          if (res.success) {
            soundEngine.playCorrect();
            showToast('Registered for live event! Real-time sync updated.', 'success');

            // Find event in array and mark as registered
            const ev = events.find(e => e.id === evId);
            if (ev) {
              ev.isRegistered = true;
              ev.registrationCount = res.totalRegistered;
            }

            // Immediately morph the button without page refresh!
            const actionWrap = container.querySelector(`#action-container-${evId}`);
            if (actionWrap && ev) {
              const isLive = ev.status === 'LIVE_NOW' || ev.status === 'LOBBY' || ev.status === 'QUESTION_ACTIVE';
              actionWrap.innerHTML = renderEventAction(ev, isLive, false);
              attachActionListeners();
            }

            const regLabel = container.querySelector(`#reg-count-${evId}`);
            if (regLabel) {
              regLabel.textContent = `${res.totalRegistered} Registered`;
            }
          }
        } catch (err) {
          console.error(err);
          showToast('Failed to register for event.', 'warn');
          (btn as HTMLButtonElement).disabled = false;
          btn.innerHTML = `<span>Register for Event</span> ${icon('Check', 14)}`;
        }
      });
    });

    // Enter Live Quiz Room
    container.querySelectorAll('.btn-enter-live-quiz').forEach(btn => {
      btn.addEventListener('click', () => {
        soundEngine.playClick();
        const evId = btn.getAttribute('data-id');
        if (evId) {
          onNavigate('live-event', { eventId: evId });
        }
      });
    });

    // View Leaderboard
    container.querySelectorAll('.btn-view-leaderboard').forEach(btn => {
      btn.addEventListener('click', () => {
        soundEngine.playClick();
        const evId = btn.getAttribute('data-id');
        if (evId) {
          onNavigate('live-event', { eventId: evId, viewLeaderboardOnly: true });
        }
      });
    });
  }

  // Real-time synchronization via WebSocket
  wsClient.connect();

  const unsubs = [
    wsClient.on('EVENT_CREATED', (newEvent: QuizEvent) => {
      if (!events.find(e => e.id === newEvent.id)) {
        events.unshift(newEvent);
        renderEventsGrid();
        showToast(`New Live Event created: ${newEvent.title}`, 'info');
      }
    }),
    wsClient.on('EVENT_UPDATED', (updatedData: Partial<QuizEvent>) => {
      const ev = events.find(e => e.id === updatedData.id);
      if (ev) {
        Object.assign(ev, updatedData);
        renderEventsGrid();
      }
    }),
    wsClient.on('EVENT_DELETED', ({ id }: { id: string }) => {
      events = events.filter(e => e.id !== id);
      renderEventsGrid();
    }),
    wsClient.on('EVENT_REGISTERED', ({ eventId, totalRegistered }: any) => {
      const ev = events.find(e => e.id === eventId);
      if (ev) {
        ev.registrationCount = totalRegistered;
        const regLabel = container.querySelector(`#reg-count-${eventId}`);
        if (regLabel) {
          regLabel.textContent = `${totalRegistered} Registered`;
        }
      }
    }),
    wsClient.on('EVENT_STARTED', ({ eventId }: any) => {
      const ev = events.find(e => e.id === eventId);
      if (ev) {
        ev.status = 'LIVE_NOW';
        renderEventsGrid();
        showToast(`Event "${ev.title}" is now LIVE!`, 'success');
      }
    })
  ];

  loadEvents();
}

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
