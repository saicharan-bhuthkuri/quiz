import { icon } from '../components/Icons.ts';
import { soundEngine } from '../components/AudioEffects.ts';
import { getLoggedInUser } from '../auth.ts';
import { showToast } from '../components/Toast.ts';
import { wsClient } from '../services/wsClient.ts';
import { launchConfetti } from '../components/Confetti.ts';

export function renderLiveEventQuizView(
  container: HTMLElement,
  params: { eventId: string; viewLeaderboardOnly?: boolean },
  onNavigate: (view: string) => void
): void {
  const { eventId } = params;
  const user = getLoggedInUser() || {
    id: 'usr_guest',
    name: 'Engineer Guest',
    email: 'guest@engiverse.io'
  };

  // State
  let eventTitle = 'Live Engineering Event';
  let eventStatus:
    | 'UPCOMING'
    | 'EVENT_STARTED_WAITING_QUESTION'
    | 'LOBBY'
    | 'QUESTION_ACTIVE'
    | 'QUESTION_ENDED'
    | 'EVENT_ENDED' = 'UPCOMING';
  let currentQuestion: any = null;
  let currentQuestionIdx = -1;
  let totalQuestions = 5;
  let remainingSeconds = 30;
  let totalQuestionSeconds = 30;
  let hasAnsweredCurrent = false;
  let selectedOptionIdx: number | null = null;
  let questionStartTime = Date.now();

  function getStatusBadgeText(): string {
    switch (eventStatus) {
      case 'UPCOMING':
        return 'Registered — Waiting for Host';
      case 'EVENT_STARTED_WAITING_QUESTION':
      case 'LOBBY':
        return 'Event Started — Waiting for Next Question';
      case 'QUESTION_ACTIVE':
        return hasAnsweredCurrent
          ? 'Answer Submitted — Waiting for Next Question'
          : `Question ${currentQuestionIdx + 1} of ${totalQuestions}`;
      case 'QUESTION_ENDED':
        return 'Question Ended — Waiting for Next Question';
      case 'EVENT_ENDED':
        return 'Event Completed — Thank You';
      default:
        return 'Connected (WebSocket Active)';
    }
  }

  function renderView() {
    container.innerHTML = `
      <div class="portal-viewport live-arena-viewport">
        <!-- Live Header Bar -->
        <header class="portal-header live-header">
          <div class="portal-header-inner">
            <button id="btn-leave-live-room" class="btn btn-secondary btn-pill">
              <span>${icon('ArrowLeft', 14)} Exit to Events</span>
            </button>

            <div class="live-event-center-header">
              <span class="live-broadcast-chip"><span class="pulse-dot"></span> REAL-TIME SYNC</span>
              <h2 class="live-event-heading">${escapeHtml(eventTitle)}</h2>
            </div>

            <div class="live-status-pill">
              <span class="pulse-dot"></span>
              <span class="live-status-pill-text" id="live-header-status-text">${getStatusBadgeText()}</span>
            </div>
          </div>
        </header>

        <!-- Live Content Viewport -->
        <main class="portal-main-content live-main-arena" id="live-arena-container">
          ${renderCurrentStateBody()}
        </main>
      </div>
    `;

    container.querySelector('#btn-leave-live-room')?.addEventListener('click', () => {
      soundEngine.playClick();
      leaveRoom();
    });

    attachLiveInteractions();
  }

  function renderCurrentStateBody(): string {
    // Phase 8: Admin Ends Event -> Participant screen changes to "Event Completed — Thank You for Participating"
    if (eventStatus === 'EVENT_ENDED') {
      return `
        <div class="live-completed-card">
          <div class="completed-icon-ring">
            <span class="completed-icon">${icon('CheckCircle2', 48)}</span>
          </div>

          <span class="completed-badge-pill">COMPETITION CONCLUDED</span>
          <h1 class="completed-title">Event Completed — Thank You for Participating</h1>
          <p class="completed-desc">
            Your responses have been successfully recorded and submitted to the evaluation engine.
            The administrator has concluded the competition. Thank you for your active participation!
          </p>

          <div class="lobby-status-box" style="max-width: 480px; margin: 0 auto 2rem;">
            <div class="status-item">
              <span class="item-label">${icon('User', 13)} Participant</span>
              <span class="item-val">${escapeHtml(user.name)}</span>
            </div>
            <div class="status-divider"></div>
            <div class="status-item">
              <span class="item-label">${icon('Check', 13)} Submission Status</span>
              <span class="item-val" style="color: #16a34a; font-weight: 700;">Recorded Successfully</span>
            </div>
          </div>

          <div class="completed-action-row">
            <button id="btn-return-events" class="btn btn-primary btn-pill" style="padding: 0.85rem 2rem; font-weight: 700;">
              <span>Return to Events Arena</span>
              ${icon('ArrowRight', 14)}
            </button>
          </div>
        </div>
      `;
    }

    // Phase 1: Before Admin Starts -> "Registered — Waiting for Host"
    if (eventStatus === 'UPCOMING') {
      return `
        <div class="live-lobby-card">
          <div class="lobby-radar-ring">
            <div class="radar-pulse"></div>
            <span class="radar-icon">${icon('Clock', 32)}</span>
          </div>

          <span class="lobby-badge-pill" style="background: #f1f5f9; color: #475569; border-color: #cbd5e1;">
            UPCOMING EVENT
          </span>
          <h1 class="lobby-title">Registered — Waiting for Host</h1>
          <p class="lobby-desc">
            You are officially registered for this event. Please wait for the host to start the competition.
            Questions will not be visible until the administrator broadcasts them.
          </p>

          <div class="lobby-status-box">
            <div class="status-item">
              <span class="item-label">${icon('Wifi', 13)} Connection</span>
              <span class="item-val" style="color: #16a34a; font-weight: 700;">● Synchronized (WebSocket Active)</span>
            </div>
            <div class="status-divider"></div>
            <div class="status-item">
              <span class="item-label">${icon('User', 13)} Participant</span>
              <span class="item-val">${escapeHtml(user.name)}</span>
            </div>
            <div class="status-divider"></div>
            <div class="status-item">
              <span class="item-label">${icon('Shield', 13)} Status</span>
              <span class="item-val" style="color: #0284c7; font-weight: 700;">Waiting for Host</span>
            </div>
          </div>

          <div class="lobby-rules-strip">
            <span>${icon('Radio', 13)} Automatic server synchronization</span>
            <span>${icon('Lock', 13)} Responses encrypted & recorded securely</span>
            <span>${icon('Wifi', 13)} Seamless auto-reconnect</span>
          </div>
        </div>
      `;
    }

    // Phase 2: Admin Starts Event -> "Event Started — Waiting for Next Question"
    // (Do NOT immediately show a question)
    if (eventStatus === 'EVENT_STARTED_WAITING_QUESTION' || eventStatus === 'LOBBY') {
      return `
        <div class="live-lobby-card">
          <div class="lobby-radar-ring" style="border-color: #22c55e; background: #dcfce7;">
            <div class="radar-pulse" style="border-color: rgba(34, 197, 94, 0.4);"></div>
            <span class="radar-icon" style="color: #16a34a;">${icon('Radio', 32)}</span>
          </div>

          <span class="lobby-badge-pill" style="background: #f0fdf4; color: #15803d; border-color: #bbf7d0;">
            ● LIVE IN PROGRESS
          </span>
          <h1 class="lobby-title">Event Started — Waiting for Next Question</h1>
          <p class="lobby-desc">
            The administrator has started the event! Stand by, the question will appear simultaneously
            on your screen as soon as the host broadcasts it.
          </p>

          <div class="lobby-status-box">
            <div class="status-item">
              <span class="item-label">${icon('Wifi', 13)} Live Stream</span>
              <span class="item-val" style="color: #16a34a; font-weight: 700;">● Active & Ready</span>
            </div>
            <div class="status-divider"></div>
            <div class="status-item">
              <span class="item-label">${icon('User', 13)} Participant</span>
              <span class="item-val">${escapeHtml(user.name)}</span>
            </div>
            <div class="status-divider"></div>
            <div class="status-item">
              <span class="item-label">${icon('Clock', 13)} Current Step</span>
              <span class="item-val" style="color: #b45309; font-weight: 700;">Waiting for Next Question</span>
            </div>
          </div>

          <div class="lobby-rules-strip">
            <span>${icon('Clock', 13)} Synchronized server timer</span>
            <span>${icon('CheckCircle2', 13)} Real-time submission validation</span>
          </div>
        </div>
      `;
    }

    // Phase 3 & 4: Admin Sends Question (QUESTION_ACTIVE or QUESTION_ENDED)
    if (eventStatus === 'QUESTION_ACTIVE' || eventStatus === 'QUESTION_ENDED') {
      if (!currentQuestion) {
        return `
          <div class="live-lobby-card">
            <div class="admin-loading-spinner" style="margin: 0 auto 1.5rem;"></div>
            <h2 class="lobby-title" style="font-size: 1.4rem;">Waiting for Next Question...</h2>
            <p class="lobby-desc">The host is preparing the next question. Please remain on this screen.</p>
          </div>
        `;
      }

      const pct = Math.max(0, Math.min(100, (remainingSeconds / totalQuestionSeconds) * 100));
      const isEnded = eventStatus === 'QUESTION_ENDED';

      return `
        <div class="live-question-arena">
          <!-- Top timer & question progress -->
          <div class="arena-top-bar">
            <div class="arena-q-counter">
              Question <strong>${currentQuestionIdx + 1}</strong> of ${totalQuestions}
            </div>

            <div class="arena-timer-box ${remainingSeconds <= 5 ? 'timer-danger' : ''}">
              <span class="timer-icon">${icon('Clock', 15)}</span>
              <span class="timer-digits">${remainingSeconds}s</span>
            </div>
          </div>

          <!-- Synchronized Progress Bar -->
          <div class="arena-timer-bar-track">
            <div class="arena-timer-bar-fill ${remainingSeconds <= 5 ? 'fill-danger' : ''}" style="width: ${pct}%;"></div>
          </div>

          <!-- Question Body -->
          <div class="arena-card">
            <div class="arena-q-header">
              <span class="arena-pts-chip">${icon('Award', 13)} Question ${currentQuestionIdx + 1}</span>
              ${hasAnsweredCurrent ? `<span class="answer-locked-pill">${icon('CheckCircle2', 12)} Answer Recorded</span>` : ''}
            </div>

            <h2 class="arena-question-text">${escapeHtml(currentQuestion.questionText)}</h2>

            <!-- Options Grid -->
            <!-- Participant privacy: Never highlight correct/wrong colors or scores -->
            <div class="arena-options-grid" id="arena-options-grid">
              ${(currentQuestion.options || []).map((opt: string, i: number) => {
                const isSelected = selectedOptionIdx === i;
                let cls = 'arena-opt-btn';
                if (isSelected) cls += ' selected';

                return `
                  <button class="${cls}" data-index="${i}" ${hasAnsweredCurrent || isEnded ? 'disabled' : ''}>
                    <span class="opt-key">${String.fromCharCode(65 + i)}</span>
                    <span class="opt-label">${escapeHtml(opt)}</span>
                    <span class="opt-state-icon">
                      ${isSelected ? icon('Check', 16) : ''}
                    </span>
                  </button>
                `;
              }).join('')}
            </div>

            <!-- Submit Answer Button (Before submission) -->
            ${!hasAnsweredCurrent && !isEnded ? `
              <div class="arena-submit-row">
                <button id="btn-submit-live-answer" class="btn btn-primary btn-pill btn-lock-answer" ${selectedOptionIdx === null ? 'disabled' : ''}>
                  <span>${icon('Lock', 14)} Submit Answer</span>
                </button>
              </div>
            ` : ''}

            <!-- Phase 4: Participant Answers -> "Answer Submitted — Waiting for Next Question" -->
            ${hasAnsweredCurrent ? `
              <div class="arena-locked-notice">
                <div class="locked-icon-badge">${icon('CheckCircle2', 24)}</div>
                <div class="locked-text">
                  <h3 class="locked-headline">Answer Submitted — Waiting for Next Question</h3>
                  <p class="locked-subtext">
                    Your response has been securely recorded on the server. Please wait for the host to send the next question.
                  </p>
                </div>
              </div>
            ` : isEnded ? `
              <!-- Phase 4/6: Question timer ended without answer -->
              <div class="arena-question-ended-notice">
                <div class="ended-icon-badge">${icon('Clock', 22)}</div>
                <div class="ended-text">
                  <h3 class="ended-headline">Question Time Ended — Waiting for Next Question</h3>
                  <p class="ended-subtext">
                    Time for this question has expired. Please stand by while the host broadcasts the next question.
                  </p>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }

    return `
      <div class="live-lobby-card">
        <div class="admin-loading-spinner" style="margin: 0 auto 1.5rem;"></div>
        <h2 class="lobby-title" style="font-size: 1.4rem;">Connecting to Live Event...</h2>
        <p class="lobby-desc">Establishing real-time synchronization with server.</p>
      </div>
    `;
  }

  function attachLiveInteractions() {
    // Option clicks in active question
    container.querySelectorAll('.arena-opt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (hasAnsweredCurrent || eventStatus !== 'QUESTION_ACTIVE') return;
        soundEngine.playClick();
        const idx = Number(btn.getAttribute('data-index'));
        selectedOptionIdx = idx;

        container.querySelectorAll('.arena-opt-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        const submitBtn = container.querySelector<HTMLButtonElement>('#btn-submit-live-answer');
        if (submitBtn) submitBtn.disabled = false;
      });
    });

    // Submit Answer Button (Phase 4: Participant Answers)
    container.querySelector('#btn-submit-live-answer')?.addEventListener('click', () => {
      if (selectedOptionIdx === null || hasAnsweredCurrent || !currentQuestion) return;
      soundEngine.playClick();
      hasAnsweredCurrent = true;

      const timeSpent = Math.max(1, (Date.now() - questionStartTime) / 1000);

      // Submit immediately over WebSocket to Backend
      wsClient.send('SUBMIT_ANSWER', {
        eventId,
        questionId: currentQuestion.id,
        selectedOption: selectedOptionIdx,
        timeTakenSeconds: timeSpent
      });

      showToast('Answer submitted! Waiting for next question...', 'success');
      renderView();
    });

    // Return to Events from Concluded Screen
    container.querySelector('#btn-return-events')?.addEventListener('click', () => {
      soundEngine.playClick();
      leaveRoom();
    });
  }

  function leaveRoom() {
    unsubs.forEach(cleanup => cleanup());
    wsClient.leaveEventRoom(eventId);
    onNavigate('events');
  }

  // =========================================================================
  // WEBSOCKET SUBSCRIPTIONS (Synchronized Real-Time Event Flow)
  // =========================================================================

  wsClient.connect();
  wsClient.joinEventRoom(eventId);

  const unsubs = [
    // 1. Full State Snapshot (reconnection resilience)
    wsClient.on('EVENT_STATE_SNAPSHOT', (snap: any) => {
      if (snap.eventId !== eventId) return;

      eventTitle = snap.title || eventTitle;
      eventStatus = snap.status;
      if (eventStatus === 'LOBBY' || (eventStatus as string) === 'LIVE_NOW') {
        eventStatus = snap.question ? 'QUESTION_ACTIVE' : 'EVENT_STARTED_WAITING_QUESTION';
      }
      currentQuestionIdx = snap.currentQuestionIndex;
      totalQuestions = snap.totalQuestions || totalQuestions;
      remainingSeconds = snap.questionRemainingSeconds ?? remainingSeconds;
      totalQuestionSeconds = snap.question?.timerSeconds || 30;
      currentQuestion = snap.question;
      hasAnsweredCurrent = !!snap.answeredCurrent;
      if (snap.selectedOption !== undefined && snap.selectedOption !== null) {
        selectedOptionIdx = snap.selectedOption;
      }

      renderView();
    }),

    // 2. Admin Starts Event (Phase 2: "Event Started — Waiting for Next Question")
    wsClient.on('EVENT_STARTED', (data: any) => {
      if (data.eventId !== eventId) return;
      soundEngine.playCorrect();
      showToast('Event started! Waiting for host to send Question 1...', 'info');
      eventStatus = 'EVENT_STARTED_WAITING_QUESTION';
      renderView();
    }),

    // 3. Admin Sends Question (Phase 3: "Send Question")
    wsClient.on('QUESTION_SENT', (data: any) => {
      if (data.eventId !== eventId) return;
      soundEngine.playCorrect();
      eventStatus = 'QUESTION_ACTIVE';
      currentQuestionIdx = data.questionIndex;
      totalQuestions = data.totalQuestions || totalQuestions;
      currentQuestion = data.question;
      totalQuestionSeconds = data.question.timerSeconds || 30;
      remainingSeconds = totalQuestionSeconds;
      hasAnsweredCurrent = false;
      selectedOptionIdx = null;
      questionStartTime = Date.now();
      renderView();
    }),

    // 4. Synchronized Countdown Timer Tick
    wsClient.on('QUESTION_TIMER_STARTED', (data: any) => {
      if (data.eventId !== eventId) return;
      remainingSeconds = data.remainingSeconds;
      const digits = container.querySelector('.timer-digits');
      const bar = container.querySelector<HTMLElement>('.arena-timer-bar-fill');
      const timerBox = container.querySelector('.arena-timer-box');

      if (digits) digits.textContent = `${remainingSeconds}s`;
      if (bar) {
        const pct = Math.max(0, Math.min(100, (remainingSeconds / totalQuestionSeconds) * 100));
        bar.style.width = `${pct}%`;
      }
      if (remainingSeconds <= 5) {
        timerBox?.classList.add('timer-danger');
        bar?.classList.add('fill-danger');
      }
    }),

    // 5. Answer Submitted Acknowledgment from Server (Direct client ACK)
    wsClient.on('ANSWER_SUBMITTED', (data: any) => {
      if (data.questionId === currentQuestion?.id || data.eventId === eventId) {
        hasAnsweredCurrent = true;
        if (data.selectedOption !== undefined && data.selectedOption !== null) {
          selectedOptionIdx = data.selectedOption;
        }
        renderView();
      }
    }),

    // 6. Question Ended (Time expired or Host ended question before sending next)
    wsClient.on('QUESTION_ENDED', (data: any) => {
      if (data.eventId !== eventId) return;
      eventStatus = 'QUESTION_ENDED';
      renderView();
    }),

    // 7. Admin Ends Event (Phase 8: "Event Completed — Thank You for Participating")
    wsClient.on('EVENT_ENDED', (data: any) => {
      if (data.eventId !== eventId) return;
      eventStatus = 'EVENT_ENDED';
      launchConfetti();
      soundEngine.playCorrect();
      renderView();
    })
  ];

  // Initial render
  renderView();
}

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
