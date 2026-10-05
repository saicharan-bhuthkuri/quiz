import { QuizQuestion } from '../types/index.ts';
import { soundEngine } from './AudioEffects.ts';
import { launchConfetti } from './Confetti.ts';
import { showToast } from './Toast.ts';
import { getLoggedInUser, saveUserSession } from '../auth.ts';
import { recordQuizAttemptToTurso } from '../db/turso.ts';
import { icon } from './Icons.ts';
import { apiGetDiagnosticQuestions } from '../api/client.ts';

export class InteractiveHeroQuiz {
  private container: HTMLElement;
  private questions: QuizQuestion[] = [];
  private isLoading: boolean = true;
  private currentIndex: number = 0;
  private userScore: number = 0;
  private totalXP: number = 0;
  private answeredCurrent: boolean = false;
  private timerSeconds: number = 25;
  private timerInterval: number | null = null;
  private isHintShown: boolean = false;
  private userAnswers: { question: QuizQuestion; selectedIndex: number; isCorrect: boolean }[] = [];

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Container #${containerId} not found`);
    this.container = el;
    this.render();

    apiGetDiagnosticQuestions()
      .then(res => {
        this.isLoading = false;
        if (res && res.success && Array.isArray(res.questions)) {
          this.questions = res.questions;
        }
        this.render();
      })
      .catch(err => {
        this.isLoading = false;
        console.warn('Dynamic diagnostic questions fetch error:', err);
        this.render();
      });
  }

  private startTimer(): void {
    this.stopTimer();
    this.timerSeconds = 25;
    this.updateTimerDisplay();

    this.timerInterval = window.setInterval(() => {
      this.timerSeconds--;
      this.updateTimerDisplay();

      if (this.timerSeconds <= 0) {
        this.stopTimer();
        if (!this.answeredCurrent) {
          this.handleTimeout();
        }
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private updateTimerDisplay(): void {
    const timerText = this.container.querySelector<HTMLElement>('#quiz-timer-text');
    const timerBar = this.container.querySelector<HTMLElement>('#quiz-timer-bar');
    if (timerText) {
      timerText.textContent = `${this.timerSeconds}s`;
      if (this.timerSeconds <= 5) {
        timerText.classList.add('timer-warning');
      } else {
        timerText.classList.remove('timer-warning');
      }
    }
    if (timerBar) {
      const percentage = (this.timerSeconds / 25) * 100;
      timerBar.style.width = `${percentage}%`;
      if (this.timerSeconds <= 5) {
        timerBar.style.backgroundColor = '#ef4444';
      } else {
        timerBar.style.backgroundColor = 'var(--primary-color)';
      }
    }
  }

  private handleTimeout(): void {
    this.answeredCurrent = true;
    soundEngine.playWrong();
    showToast('Time expired for this question!', 'warn');

    const currentQ = this.questions[this.currentIndex];
    this.userAnswers.push({
      question: currentQ,
      selectedIndex: -1,
      isCorrect: false
    });

    this.highlightAnswers(-1, currentQ.correctIndex);
    this.showExplanation(false, 'Time expired before an answer was chosen.');
  }

  private handleSelectAnswer(selectedIndex: number): void {
    if (this.answeredCurrent) return;
    this.answeredCurrent = true;
    this.stopTimer();

    const currentQ = this.questions[this.currentIndex];
    const isCorrect = selectedIndex === currentQ.correctIndex;

    if (isCorrect) {
      soundEngine.playCorrect();
      const speedBonus = this.timerSeconds * 5;
      const earned = currentQ.xpReward + speedBonus;
      this.userScore++;
      this.totalXP += earned;
      showToast(`Correct! +${earned} XP earned`, 'success');
      launchConfetti();
    } else {
      soundEngine.playWrong();
      showToast('Incorrect — review the concept breakdown below!', 'warn');
    }

    this.userAnswers.push({
      question: currentQ,
      selectedIndex,
      isCorrect
    });

    this.highlightAnswers(selectedIndex, currentQ.correctIndex);
    this.showExplanation(isCorrect, currentQ.explanation);
  }

  private highlightAnswers(selectedIndex: number, correctIndex: number): void {
    const optionButtons = this.container.querySelectorAll<HTMLButtonElement>('.quiz-option-btn');
    optionButtons.forEach((btn, idx) => {
      btn.disabled = true;
      if (idx === correctIndex) {
        btn.classList.add('option-correct');
      } else if (idx === selectedIndex) {
        btn.classList.add('option-wrong');
      } else {
        btn.classList.add('option-dimmed');
      }
    });
  }

  private showExplanation(isCorrect: boolean, explanationText: string): void {
    const feedbackBox = this.container.querySelector<HTMLElement>('#quiz-feedback-box');
    const nextBtn = this.container.querySelector<HTMLButtonElement>('#quiz-next-btn');

    if (feedbackBox) {
      feedbackBox.classList.remove('hidden');
      feedbackBox.innerHTML = `
        <div class="feedback-badge ${isCorrect ? 'badge-success' : 'badge-danger'}">
          ${isCorrect ? `${icon('CheckCircle2', 15)} Spot-On Insight` : `${icon('AlertCircle', 15)} Key Concept to Master`}
        </div>
        <p class="feedback-text">${explanationText}</p>
      `;
    }

    if (nextBtn) {
      nextBtn.classList.remove('hidden');
      if (this.currentIndex === this.questions.length - 1) {
        nextBtn.innerHTML = `<span>See Diagnostic Rank</span> <span class="arrow">${icon('Trophy', 15)}</span>`;
      } else {
        nextBtn.innerHTML = `<span>Next Challenge</span> <span class="arrow">${icon('ArrowRight', 15)}</span>`;
      }
    }
  }

  private nextQuestion(): void {
    soundEngine.playClick();
    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex++;
      this.answeredCurrent = false;
      this.isHintShown = false;
      this.renderQuestion();
    } else {
      this.renderResults();
    }
  }

  private toggleHint(): void {
    soundEngine.playClick();
    this.isHintShown = !this.isHintShown;
    const hintBox = this.container.querySelector<HTMLElement>('#quiz-hint-box');
    const hintBtn = this.container.querySelector<HTMLButtonElement>('#quiz-hint-toggle');
    if (hintBox && hintBtn) {
      if (this.isHintShown) {
        hintBox.classList.remove('hidden');
        hintBtn.innerHTML = `Hide Hint ${icon('Lightbulb', 14)}`;
      } else {
        hintBox.classList.add('hidden');
        hintBtn.innerHTML = `Need a Hint? ${icon('Lightbulb', 14)}`;
      }
    }
  }

  private resetQuiz(): void {
    soundEngine.playClick();
    this.currentIndex = 0;
    this.userScore = 0;
    this.totalXP = 0;
    this.answeredCurrent = false;
    this.isHintShown = false;
    this.userAnswers = [];
    this.renderQuestion();
  }

  public render(): void {
    this.renderQuestion();
  }

  private renderQuestion(): void {
    if (this.isLoading) {
      this.container.innerHTML = `
        <div class="hero-quiz-card" style="text-align: center; padding: 3.5rem 2rem;">
          <div class="admin-loading-spinner" style="margin: 0 auto 1rem;"></div>
          <span style="color: var(--text-muted); font-size: 0.95rem; display: block;">
            Loading live diagnostic challenge from database...
          </span>
        </div>
      `;
      return;
    }

    if (this.questions.length === 0) {
      this.container.innerHTML = `
        <div class="hero-quiz-card" style="text-align: center; padding: 3rem 2rem;">
          <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">⚡</div>
          <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--text-main);">Engineering Arena Ready</h3>
          <p style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.5; max-width: 400px; margin: 0 auto 1.5rem;">
            Questions are loaded dynamically from the live database. Create events and questions in the Admin Console to launch real-time challenges.
          </p>
        </div>
      `;
      return;
    }

    const currentQ = this.questions[this.currentIndex];
    const progressPercent = ((this.currentIndex + 1) / this.questions.length) * 100;

    this.container.innerHTML = `
      <div class="hero-quiz-card">
        <!-- Card Header with Live Indicators -->
        <div class="quiz-card-header">
          <div class="header-left">
            <span class="live-pulse-dot"></span>
            <span class="domain-tag">${currentQ.domainName}</span>
            <span class="difficulty-tag ${currentQ.difficulty.toLowerCase()}">${currentQ.difficulty}</span>
          </div>
          <div class="header-right">
            <div class="timer-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span id="quiz-timer-text">15s</span>
            </div>
            <div class="xp-badge">${icon('Zap', 12)} ${currentQ.xpReward} XP</div>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="quiz-progress-track">
          <div class="quiz-progress-fill" style="width: ${progressPercent}%;"></div>
        </div>
        <div class="quiz-progress-labels">
          <span>Question ${this.currentIndex + 1} of ${this.questions.length}</span>
          <span>Score: ${this.userScore}/${this.currentIndex}</span>
        </div>

        <!-- Timer Countdown Line -->
        <div class="quiz-timer-track">
          <div id="quiz-timer-bar" class="quiz-timer-bar" style="width: 100%;"></div>
        </div>

        <!-- Question Body -->
        <div class="quiz-question-body">
          <h3 class="question-title">${currentQ.question}</h3>
          ${
            currentQ.codeSnippet
              ? `<pre class="code-snippet-block"><code>${escapeHtml(currentQ.codeSnippet)}</code></pre>`
              : ''
          }
        </div>

        <!-- Options Grid -->
        <div class="quiz-options-list">
          ${currentQ.options
            .map(
              (option, idx) => `
              <button class="quiz-option-btn" data-index="${idx}">
                <span class="option-letter">${String.fromCharCode(65 + idx)}</span>
                <span class="option-text">${escapeHtml(option)}</span>
              </button>
            `
            )
            .join('')}
        </div>

        <!-- Hint Action -->
        <div class="quiz-hint-wrapper">
          <button id="quiz-hint-toggle" class="btn-hint-toggle">Need a Hint? ${icon('Lightbulb', 14)}</button>
          <div id="quiz-hint-box" class="quiz-hint-box hidden">
            <em>${icon('Lightbulb', 14)} Clue:</em> ${currentQ.hint}
          </div>
        </div>

        <!-- Dynamic Feedback Box (Hidden initially) -->
        <div id="quiz-feedback-box" class="quiz-feedback-box hidden"></div>

        <!-- Footer Actions -->
        <div class="quiz-footer-actions">
          <div class="footer-note">${icon('Zap', 13)} Real-time calibration active</div>
          <button id="quiz-next-btn" class="btn-quiz-next hidden">
            <span>Next Challenge</span> <span class="arrow">${icon('ArrowRight', 15)}</span>
          </button>
        </div>
      </div>
    `;

    // Attach Listeners
    const optionBtns = this.container.querySelectorAll<HTMLButtonElement>('.quiz-option-btn');
    optionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index') || '0', 10);
        this.handleSelectAnswer(idx);
      });
    });

    const hintToggle = this.container.querySelector<HTMLButtonElement>('#quiz-hint-toggle');
    if (hintToggle) {
      hintToggle.addEventListener('click', () => this.toggleHint());
    }

    const nextBtn = this.container.querySelector<HTMLButtonElement>('#quiz-next-btn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.nextQuestion());
    }

    // Start timer for current question
    this.startTimer();
  }

  private renderResults(): void {
    this.stopTimer();
    soundEngine.playCelebration();
    launchConfetti();

    const accuracy = Math.round((this.userScore / this.questions.length) * 100);
    let rankTitle = 'Cadet Apprentice';
    let rankBadge = `${icon('Award', 14)} Level 1`;
    let percentile = 'Top 65%';

    if (accuracy === 100) {
      rankTitle = 'Principal Systems Architect';
      rankBadge = `${icon('Trophy', 14)} Grandmaster Tier`;
      percentile = 'Top 2% Worldwide';
    } else if (accuracy >= 66) {
      rankTitle = 'Senior Core Engineer';
      rankBadge = `${icon('Medal', 14)} Advanced Tier`;
      percentile = 'Top 15% Worldwide';
    }

    // Persist attempt to Turso Database
    const currentUser = getLoggedInUser();
    if (currentUser) {
      recordQuizAttemptToTurso({
        userEmail: currentUser.email,
        userName: currentUser.name,
        score: this.userScore,
        totalQuestions: this.questions.length,
        xpEarned: this.totalXP,
        rankTitle
      });
      currentUser.xp = (currentUser.xp || 0) + this.totalXP;
      currentUser.streak = (currentUser.streak || 1) + 1;
      saveUserSession(currentUser);
    }

    this.container.innerHTML = `
      <div class="hero-quiz-card results-card">
        <div class="results-header">
          <div class="results-trophy">${icon('Target', 36)}</div>
          <h3 class="results-title">Diagnostic Assessment Complete!</h3>
          <p class="results-subtitle">Engiverse Skill Calibration Engine</p>
        </div>

        <div class="results-score-grid">
          <div class="score-card">
            <span class="score-value">${accuracy}%</span>
            <span class="score-label">Accuracy (${this.userScore}/${this.questions.length})</span>
          </div>
          <div class="score-card accent">
            <span class="score-value">+${this.totalXP}</span>
            <span class="score-label">XP Gained</span>
          </div>
          <div class="score-card">
            <span class="score-value">${percentile}</span>
            <span class="score-label">Global Percentile</span>
          </div>
        </div>

        <div class="rank-result-banner">
          <div class="rank-icon-wrap">${icon('Shield', 22)}</div>
          <div class="rank-info">
            <div class="rank-badge-pill">${rankBadge}</div>
            <div class="rank-name">${rankTitle}</div>
            <div class="rank-desc">Ready to test in live 1v1 arenas against top engineering peers!</div>
          </div>
        </div>

        <div class="results-actions">
          <button id="btn-retake-quiz" class="btn-quiz-secondary">
            ${icon('RotateCw', 14)} Try Another Set
          </button>
          <a href="#domains" class="btn-quiz-primary">
            <span>Explore 500+ Universes</span> ${icon('Rocket', 14)}
          </a>
        </div>
      </div>
    `;

    const retakeBtn = this.container.querySelector<HTMLButtonElement>('#btn-retake-quiz');
    if (retakeBtn) {
      retakeBtn.addEventListener('click', () => this.resetQuiz());
    }
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
