import { icon } from '../components/Icons.ts';
import { soundEngine } from '../components/AudioEffects.ts';
import { getLoggedInUser } from '../auth.ts';
import { showToast } from '../components/Toast.ts';
import { wsClient } from '../services/wsClient.ts';
import { LeaderboardEntry } from '../api/client.ts';
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
  let eventStatus: 'UPCOMING' | 'LOBBY' | 'QUESTION_ACTIVE' | 'QUESTION_ENDED' | 'EVENT_ENDED' = 'LOBBY';
  let currentQuestion: any = null;
  let currentQuestionIdx = -1;
  let totalQuestions = 5;
  let remainingSeconds = 30;
  let totalQuestionSeconds = 30;
  let hasAnsweredCurrent = false;
  let selectedOptionIdx: number | null = null;
  let myScore = 0;
  let myCorrectCount = 0;
  let currentLeaderboard: LeaderboardEntry[] = [];
  let questionStartTime = Date.now();

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

            <div class="live-score-pill">
              <span class="score-icon">${icon('Zap', 14)}</span>
              <span class="score-text">My Score: <strong id="live-user-score">${myScore}</strong> (<span id="live-user-correct">${myCorrectCount}</span> correct)</span>
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
    if (params.viewLeaderboardOnly || eventStatus === 'EVENT_ENDED') {
      return renderFinalLeaderboard();
    }

    if (eventStatus === 'LOBBY' || eventStatus === 'UPCOMING') {
      return `
        <div class="live-lobby-card">
          <div class="lobby-radar-ring">
            <div class="radar-pulse"></div>
            <span class="radar-icon">${icon('Radio', 32)}</span>
          </div>

          <span class="lobby-badge-pill">COMPETITION WAITING LOBBY</span>
          <h1 class="lobby-title">Waiting for Host to Start Event</h1>
          <p class="lobby-desc">
            You are officially registered and connected via real-time WebSocket. As soon as the administrator presses <strong>"Start Event"</strong>, Question 1 will appear simultaneously for all participants.
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
          </div>

          <div class="lobby-rules-strip">
            <span>${icon('Clock', 13)} Automatic server countdown timers</span>
            <span>${icon('Zap', 13)} Speed bonus for fast correct answers</span>
            <span>${icon('Shield', 13)} Seamless auto-reconnect</span>
          </div>
        </div>
      `;
    }

    if (eventStatus === 'QUESTION_ACTIVE' || eventStatus === 'QUESTION_ENDED') {
      if (!currentQuestion) {
        return `
          <div class="live-lobby-card">
            <div class="admin-loading-spinner"></div>
            <h2 style="margin-top: 1rem; font-size: 1.15rem;">Awaiting next question from Host...</h2>
          </div>
        `;
      }

      const pct = Math.max(0, Math.min(100, (remainingSeconds / totalQuestionSeconds) * 100));

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
              <span class="arena-pts-chip">${icon('Zap', 13)} ${currentQuestion.points || 100} Points</span>
              ${hasAnsweredCurrent ? `<span class="answer-locked-pill">${icon('Lock', 12)} Answer Locked In</span>` : ''}
            </div>

            <h2 class="arena-question-text">${escapeHtml(currentQuestion.questionText)}</h2>

            <!-- Options Grid -->
            <div class="arena-options-grid" id="arena-options-grid">
              ${(currentQuestion.options || []).map((opt: string, i: number) => {
                const isSelected = selectedOptionIdx === i;
                const isRevealed = eventStatus === 'QUESTION_ENDED';
                const isCorrect = isRevealed && i === currentQuestion.correctOption;
                const isWrongSelection = isRevealed && isSelected && i !== currentQuestion.correctOption;

                let cls = 'arena-opt-btn';
                if (isSelected) cls += ' selected';
                if (isCorrect) cls += ' correct';
                if (isWrongSelection) cls += ' wrong';

                return `
                  <button class="${cls}" data-index="${i}" ${hasAnsweredCurrent || isRevealed ? 'disabled' : ''}>
                    <span class="opt-key">${String.fromCharCode(65 + i)}</span>
                    <span class="opt-label">${escapeHtml(opt)}</span>
                    <span class="opt-state-icon">
                      ${isCorrect ? icon('CheckCircle2', 18) : isWrongSelection ? icon('XCircle', 18) : ''}
                    </span>
                  </button>
                `;
              }).join('')}
            </div>

            <!-- Lock Answer Button -->
            ${!hasAnsweredCurrent && eventStatus === 'QUESTION_ACTIVE' ? `
              <div class="arena-submit-row">
                <button id="btn-submit-live-answer" class="btn btn-primary btn-pill btn-lock-answer" ${selectedOptionIdx === null ? 'disabled' : ''}>
                  <span>${icon('Lock', 14)} Submit & Lock Answer</span>
                </button>
              </div>
            ` : ''}

            <!-- Waiting for Host / Explanation Strip -->
            ${eventStatus === 'QUESTION_ENDED' ? `
              <div class="arena-reveal-box">
                <div class="reveal-header">
                  <span class="reveal-icon">${icon('Lightbulb', 16)}</span>
                  <span class="reveal-title">Question Time Ended • Official Explanation</span>
                </div>
                <p class="reveal-desc">${escapeHtml(currentQuestion.explanation || 'Answer locked in by server.')}</p>
                <div class="reveal-interim-note">
                  ${icon('Clock', 14)} Waiting for Host to broadcast next question...
                </div>
              </div>
            ` : hasAnsweredCurrent ? `
              <div class="arena-locked-notice">
                <span class="locked-icon">${icon('CheckCircle2', 18)}</span>
                <div class="locked-text">
                  <strong>Answer recorded on server!</strong>
                  <span>Waiting for timer to expire or host to advance to next question...</span>
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Interim Leaderboard Preview -->
          ${currentLeaderboard.length > 0 ? `
            <div class="arena-interim-leaderboard">
              <h4 class="interim-heading">${icon('Trophy', 14)} Live Interim Standings (Top 5)</h4>
              <div class="interim-table">
                ${currentLeaderboard.slice(0, 5).map(entry => `
                  <div class="interim-row ${entry.userId === user.id ? 'interim-me' : ''}">
                    <span class="int-rank">#${entry.rank}</span>
                    <span class="int-name">${escapeHtml(entry.userName)} ${entry.userId === user.id ? '(You)' : ''}</span>
                    <span class="int-score">${entry.score} pts</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      `;
    }

    return renderFinalLeaderboard();
  }

  function renderFinalLeaderboard(): string {
    return `
      <div class="final-leaderboard-container">
        <div class="leaderboard-header-banner">
          <div class="lead-badge">${icon('Trophy', 14)} FINAL COMPETITION RESULTS</div>
          <h1 class="lead-title">${escapeHtml(eventTitle)}</h1>
          <p class="lead-desc">Official final rankings computed by the real-time scoring engine across speed, accuracy, and total points.</p>
        </div>

        <!-- Podium Top 3 -->
        ${currentLeaderboard.length >= 2 ? `
          <div class="lead-podium-wrap">
            <!-- 2nd place -->
            <div class="podium-card rank-2">
              <span class="podium-medal">🥈 2nd</span>
              <span class="podium-name">${escapeHtml(currentLeaderboard[1]?.userName || '—')}</span>
              <span class="podium-pts">${currentLeaderboard[1]?.score || 0} pts</span>
              <span class="podium-correct">${currentLeaderboard[1]?.correctCount || 0} Correct</span>
            </div>
            <!-- 1st place -->
            <div class="podium-card rank-1">
              <span class="podium-crown">${icon('Crown', 24)}</span>
              <span class="podium-medal">🥇 CHAMPION</span>
              <span class="podium-name">${escapeHtml(currentLeaderboard[0]?.userName || '—')}</span>
              <span class="podium-pts">${currentLeaderboard[0]?.score || 0} pts</span>
              <span class="podium-correct">${currentLeaderboard[0]?.correctCount || 0} Correct</span>
            </div>
            <!-- 3rd place -->
            <div class="podium-card rank-3">
              <span class="podium-medal">🥉 3rd</span>
              <span class="podium-name">${escapeHtml(currentLeaderboard[2]?.userName || '—')}</span>
              <span class="podium-pts">${currentLeaderboard[2]?.score || 0} pts</span>
              <span class="podium-correct">${currentLeaderboard[2]?.correctCount || 0} Correct</span>
            </div>
          </div>
        ` : ''}

        <!-- Leaderboard Table -->
        <div class="lead-table-card">
          <table class="lead-table">
            <thead>
              <tr>
                <th style="width: 70px;">Rank</th>
                <th>Participant</th>
                <th style="text-align: right;">Score</th>
                <th style="text-align: right;">Correct</th>
                <th style="text-align: right;">Time</th>
              </tr>
            </thead>
            <tbody>
              ${currentLeaderboard.map(item => `
                <tr class="${item.userId === user.id ? 'row-me' : ''}">
                  <td class="lead-rank-col">
                    ${item.rank === 1 ? '🥇 1' : item.rank === 2 ? '🥈 2' : item.rank === 3 ? '🥉 3' : `#${item.rank}`}
                  </td>
                  <td class="lead-name-col">
                    <strong>${escapeHtml(item.userName)}</strong>
                    ${item.userId === user.id ? '<span class="badge-you">YOU</span>' : ''}
                  </td>
                  <td class="lead-score-col" style="text-align: right;"><strong>${item.score}</strong></td>
                  <td class="lead-correct-col" style="text-align: right;">${item.correctCount} / ${totalQuestions}</td>
                  <td class="lead-time-col" style="text-align: right;">${item.totalTimeSeconds}s</td>
                </tr>
              `).join('')}
              ${currentLeaderboard.length === 0 ? `
                <tr><td colspan="5" style="text-align: center; padding: 2rem;">No scores recorded yet.</td></tr>
              ` : ''}
            </tbody>
          </table>
        </div>

        <div class="lead-actions-row">
          <button id="btn-lead-return" class="btn btn-primary btn-pill">
            <span>Return to Events Arena</span>
            ${icon('ArrowRight', 14)}
          </button>
        </div>
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

    // Submit / Lock Answer Button
    container.querySelector('#btn-submit-live-answer')?.addEventListener('click', () => {
      if (selectedOptionIdx === null || hasAnsweredCurrent || !currentQuestion) return;
      soundEngine.playClick();
      hasAnsweredCurrent = true;

      const timeSpent = Math.max(1, (Date.now() - questionStartTime) / 1000);

      // Submit directly over WebSocket to Server!
      wsClient.send('SUBMIT_ANSWER', {
        eventId,
        questionId: currentQuestion.id,
        selectedOption: selectedOptionIdx,
        timeTakenSeconds: timeSpent
      });

      renderView();
    });

    container.querySelector('#btn-lead-return')?.addEventListener('click', () => {
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
  // WEBSOCKET SUBSCRIPTIONS & EVENT LISTENERS
  // =========================================================================

  wsClient.connect();
  wsClient.joinEventRoom(eventId);

  const unsubs = [
    // 1. Full State Snapshot (reconnection resilience!)
    wsClient.on('EVENT_STATE_SNAPSHOT', (snap: any) => {
      if (snap.eventId !== eventId) return;

      eventTitle = snap.title || eventTitle;
      eventStatus = snap.status;
      currentQuestionIdx = snap.currentQuestionIndex;
      totalQuestions = snap.totalQuestions || totalQuestions;
      remainingSeconds = snap.questionRemainingSeconds ?? remainingSeconds;
      totalQuestionSeconds = snap.question?.timerSeconds || 30;
      currentQuestion = snap.question;
      hasAnsweredCurrent = snap.answeredCurrent;
      if (snap.previousAnswer) {
        selectedOptionIdx = snap.previousAnswer.selectedOption;
      }
      if (snap.userScore) {
        myScore = snap.userScore.score;
        myCorrectCount = snap.userScore.correctCount;
      }
      if (snap.leaderboard) {
        currentLeaderboard = snap.leaderboard;
      }

      renderView();
    }),

    // 2. Event Started
    wsClient.on('EVENT_STARTED', (data: any) => {
      if (data.eventId !== eventId) return;
      soundEngine.playCorrect();
      showToast('Event has started! Get ready for Question 1...', 'info');
      eventStatus = 'LOBBY';
      renderView();
    }),

    // 3. Question Sent by Admin
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

    // 4. Question Timer Tick
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

    // 5. Answer Submitted Ack
    wsClient.on('ANSWER_SUBMITTED', (data: any) => {
      myScore = data.currentScore;
      const scoreVal = container.querySelector('#live-user-score');
      if (scoreVal) scoreVal.textContent = myScore.toString();
    }),

    // 6. Question Ended
    wsClient.on('QUESTION_ENDED', (data: any) => {
      if (data.eventId !== eventId) return;
      eventStatus = 'QUESTION_ENDED';
      if (currentQuestion) {
        currentQuestion.correctOption = data.correctOption;
        currentQuestion.explanation = data.explanation;
      }
      if (data.leaderboard) {
        currentLeaderboard = data.leaderboard;
      }
      renderView();
    }),

    // 7. Leaderboard Updated
    wsClient.on('LEADERBOARD_UPDATED', (data: any) => {
      if (data.eventId !== eventId) return;
      currentLeaderboard = data.leaderboard || [];
      const me = currentLeaderboard.find(e => e.userId === user.id);
      if (me) {
        myScore = me.score;
        myCorrectCount = me.correctCount;
        const scoreVal = container.querySelector('#live-user-score');
        if (scoreVal) scoreVal.textContent = myScore.toString();
        const corrVal = container.querySelector('#live-user-correct');
        if (corrVal) corrVal.textContent = myCorrectCount.toString();
      }
      renderView();
    }),

    // 8. Event Ended
    wsClient.on('EVENT_ENDED', (data: any) => {
      if (data.eventId !== eventId) return;
      eventStatus = 'EVENT_ENDED';
      if (data.leaderboard) {
        currentLeaderboard = data.leaderboard;
      }
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
