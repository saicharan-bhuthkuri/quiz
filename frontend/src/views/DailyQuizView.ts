import { icon } from '../components/Icons.ts';
import { soundEngine } from '../components/AudioEffects.ts';
import { getLoggedInUser } from '../auth.ts';
import { apiSubmitDailyQuiz, apiGetDailyQuizzes } from '../api/client.ts';
import { launchConfetti } from '../components/Confetti.ts';

interface DailyQuizCategory {
  id: string;
  title: string;
  domain: string;
  iconName: string;
  accent: string;
  badge: string;
  description: string;
  questions: {
    question: string;
    codeSnippet?: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    xp: number;
  }[];
}

export function renderDailyQuizView(
  container: HTMLElement,
  onNavigate: (view: string) => void
): void {
  const user = getLoggedInUser() || {
    id: 'usr_guest',
    name: 'Engineer Guest',
    email: 'guest@engiverse.io',
    streak: 1,
    xp: 250
  };

  let activeCategory: DailyQuizCategory | null = null;
  let currentQIdx = 0;
  let userAnswers: { selected: number; isCorrect: boolean; timeSeconds: number }[] = [];
  let questionStartTime = Date.now();
  let answered = false;
  let timerInterval: ReturnType<typeof setInterval> | null = null;
  let remainingSeconds = 45;

  let categories: DailyQuizCategory[] = [];
  let isLoading = true;

  apiGetDailyQuizzes()
    .then(res => {
      isLoading = false;
      if (res && res.success && Array.isArray(res.categories)) {
        categories = res.categories;
      }
      if (!activeCategory) {
        renderCategorySelector();
      }
    })
    .catch(err => {
      isLoading = false;
      console.warn('Dynamic daily quizzes fetch error:', err);
      if (!activeCategory) {
        renderCategorySelector();
      }
    });

  function renderCategorySelector() {
    container.innerHTML = `
      <div class="portal-viewport">
        <!-- Topbar -->
        <header class="portal-header">
          <div class="portal-header-inner">
            <button id="btn-back-to-portal" class="btn btn-secondary btn-pill">
              <span>${icon('ArrowLeft', 14)} Back to Portal</span>
            </button>
            <div class="portal-brand">
              <span class="portal-brand-icon">${icon('BookOpen', 20)}</span>
              <div class="portal-brand-text">
                <span class="portal-brand-title">Daily Quiz Arena</span>
                <span class="portal-brand-subtitle">INDIVIDUAL PRACTICE</span>
              </div>
            </div>
            <div class="portal-user-actions">
              <div class="portal-stat-pill streak-pill">
                <span class="pill-icon" style="color: #ea580c;">${icon('Flame', 14)}</span>
                <span class="pill-val">${user.streak || 1} Day Streak</span>
              </div>
              <div class="portal-stat-pill xp-pill">
                <span class="pill-icon" style="color: #4f46e5;">${icon('Zap', 14)}</span>
                <span class="pill-val">${(user.xp || 250).toLocaleString()} XP</span>
              </div>
            </div>
          </div>
        </header>

        <main class="portal-main-content">
          <div class="portal-welcome-banner">
            <div class="portal-welcome-pill">${icon('Sparkles', 13)} TODAY'S CHALLENGES</div>
            <h1 class="portal-main-heading">Select Today's Daily Engineering Quiz</h1>
            <p class="portal-subheading">
              Complete any daily quiz to keep your engineering streak alive and earn personal XP points. Scores are calculated automatically and stored separately from event competitions.
            </p>
          </div>

          <div class="daily-categories-grid">
            ${
              isLoading
                ? `
                  <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem;">
                    <div class="admin-loading-spinner" style="margin: 0 auto 1rem;"></div>
                    <span style="color: var(--text-muted); font-size: 0.95rem;">Loading daily quizzes from database...</span>
                  </div>
                `
                : categories.length === 0
                ? `
                  <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem;">
                    <span style="font-size: 2.5rem; display: block; margin-bottom: 1rem;">🎯</span>
                    <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--text-main);">No Daily Quizzes Available</h3>
                    <p style="color: var(--text-muted); max-width: 480px; margin: 0 auto 1.5rem;">There are currently no active quiz challenges in the database. Quizzes and questions are loaded dynamically once created by an administrator.</p>
                  </div>
                `
                : categories.map((cat, i) => `
              <div class="daily-cat-card" data-index="${i}">
                <div class="cat-card-header">
                  <div class="cat-icon-badge" style="background: ${cat.accent}15; color: ${cat.accent};">
                    ${icon(cat.iconName, 26)}
                  </div>
                  <span class="cat-pill">${cat.badge}</span>
                </div>
                <h3 class="cat-card-title">${cat.title}</h3>
                <p class="cat-card-desc">${cat.description}</p>
                <div class="cat-meta-row">
                  <span class="meta-item">${icon('CheckCircle2', 13)} ${cat.questions.length} Questions</span>
                  <span class="meta-item">${icon('Zap', 13)} ~${cat.questions.length * 100} XP</span>
                  <span class="meta-item">${icon('Clock', 13)} ~${Math.ceil(cat.questions.length * 0.75)} Mins</span>
                </div>
                <button class="btn btn-primary btn-pill btn-start-cat" data-index="${i}" style="width: 100%; justify-content: center; margin-top: 1.25rem;">
                  <span>Start Quiz Challenge</span>
                  ${icon('ArrowRight', 15)}
                </button>
              </div>
            `).join('')}
          </div>
        </main>
      </div>
    `;

    container.querySelector('#btn-back-to-portal')?.addEventListener('click', () => {
      soundEngine.playClick();
      onNavigate('portal');
    });

    container.querySelectorAll('.btn-start-cat').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = Number(btn.getAttribute('data-index'));
        startDailyQuiz(categories[idx]);
      });
    });

    container.querySelectorAll('.daily-cat-card').forEach(card => {
      card.addEventListener('click', () => {
        const idx = Number(card.getAttribute('data-index'));
        startDailyQuiz(categories[idx]);
      });
    });
  }

  function startDailyQuiz(category: DailyQuizCategory) {
    soundEngine.playClick();
    activeCategory = category;
    currentQIdx = 0;
    userAnswers = [];
    renderActiveQuestion();
  }

  function renderActiveQuestion() {
    if (!activeCategory) return;
    const q = activeCategory.questions[currentQIdx];
    answered = false;
    remainingSeconds = 45;
    questionStartTime = Date.now();

    if (timerInterval) clearInterval(timerInterval);

    container.innerHTML = `
      <div class="portal-viewport">
        <header class="portal-header">
          <div class="portal-header-inner">
            <button id="btn-quit-quiz" class="btn btn-secondary btn-pill">
              <span>${icon('X', 14)} Exit to Categories</span>
            </button>
            <div class="quiz-progress-indicator">
              <span class="q-progress-title">${escapeHtml(activeCategory.title)}</span>
              <span class="q-progress-counter">Question <strong>${currentQIdx + 1}</strong> of ${activeCategory.questions.length}</span>
            </div>
            <div class="quiz-timer-pill" id="quiz-timer-box">
              <span class="timer-icon" style="color: #4f46e5;">${icon('Clock', 14)}</span>
              <span class="timer-digits" id="timer-text">${remainingSeconds}s</span>
            </div>
          </div>
        </header>

        <main class="portal-main-content quiz-active-wrapper">
          <!-- Progress bar -->
          <div class="quiz-bar-container">
            <div class="quiz-bar-fill" style="width: ${((currentQIdx + 1) / activeCategory.questions.length) * 100}%;"></div>
          </div>

          <div class="quiz-card-main">
            <div class="quiz-question-header">
              <span class="q-domain-chip">${icon('Brain', 12)} ${escapeHtml(activeCategory.domain)}</span>
              <span class="q-xp-badge">${icon('Zap', 12)} +${q.xp} XP Points</span>
            </div>

            <h2 class="quiz-question-text">${escapeHtml(q.question)}</h2>

            ${q.codeSnippet ? `
              <div class="quiz-code-block">
                <pre><code>${escapeHtml(q.codeSnippet)}</code></pre>
              </div>
            ` : ''}

            <!-- Options -->
            <div class="quiz-options-list" id="quiz-options-container">
              ${q.options.map((opt, i) => `
                <button class="quiz-option-btn" data-index="${i}">
                  <span class="opt-prefix">${String.fromCharCode(65 + i)}</span>
                  <span class="opt-text">${escapeHtml(opt)}</span>
                  <span class="opt-status-icon"></span>
                </button>
              `).join('')}
            </div>

            <!-- Explanation Box (Appears after answer) -->
            <div class="quiz-explanation-box" id="explanation-box" style="display: none;">
              <div class="exp-title">
                <span id="exp-status-icon"></span>
                <span id="exp-status-text"></span>
              </div>
              <p class="exp-body" id="exp-body-text"></p>
            </div>

            <div class="quiz-footer-actions">
              <button id="btn-next-action" class="btn btn-primary btn-pill" style="display: none;">
                <span>${currentQIdx + 1 === activeCategory.questions.length ? 'Submit Final Quiz' : 'Next Question'}</span>
                ${icon('ArrowRight', 15)}
              </button>
            </div>
          </div>
        </main>
      </div>
    `;

    // Timer countdown
    const timerText = container.querySelector<HTMLElement>('#timer-text');
    timerInterval = setInterval(() => {
      remainingSeconds -= 1;
      if (timerText) timerText.textContent = `${remainingSeconds}s`;

      if (remainingSeconds <= 10 && timerText) {
        timerText.style.color = '#dc2626';
      }

      if (remainingSeconds <= 0) {
        if (timerInterval) clearInterval(timerInterval);
        if (!answered) handleOptionSelection(-1); // Timed out
      }
    }, 1000);

    // Option selection
    container.querySelectorAll('.quiz-option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (answered) return;
        const idx = Number(btn.getAttribute('data-index'));
        handleOptionSelection(idx);
      });
    });

    container.querySelector('#btn-quit-quiz')?.addEventListener('click', () => {
      if (timerInterval) clearInterval(timerInterval);
      soundEngine.playClick();
      renderCategorySelector();
    });

    container.querySelector('#btn-next-action')?.addEventListener('click', () => {
      soundEngine.playClick();
      if (!activeCategory) return;
      if (currentQIdx + 1 < activeCategory.questions.length) {
        currentQIdx += 1;
        renderActiveQuestion();
      } else {
        finishDailyQuiz();
      }
    });
  }

  function handleOptionSelection(selectedIndex: number) {
    if (!activeCategory || answered) return;
    answered = true;
    if (timerInterval) clearInterval(timerInterval);

    const q = activeCategory.questions[currentQIdx];
    const isCorrect = selectedIndex === q.correctIndex;
    const timeSpent = Math.max(1, Math.round((Date.now() - questionStartTime) / 1000));

    userAnswers.push({
      selected: selectedIndex,
      isCorrect,
      timeSeconds: timeSpent
    });

    if (isCorrect) {
      soundEngine.playCorrect();
    } else {
      soundEngine.playWrong();
    }

    // Update option buttons UI
    const optionsContainer = container.querySelector('#quiz-options-container');
    if (optionsContainer) {
      optionsContainer.querySelectorAll<HTMLButtonElement>('.quiz-option-btn').forEach((btn, i) => {
        btn.disabled = true;
        if (i === q.correctIndex) {
          btn.classList.add('correct');
          const iconSpan = btn.querySelector('.opt-status-icon');
          if (iconSpan) iconSpan.innerHTML = icon('CheckCircle2', 16);
        } else if (i === selectedIndex && !isCorrect) {
          btn.classList.add('incorrect');
          const iconSpan = btn.querySelector('.opt-status-icon');
          if (iconSpan) iconSpan.innerHTML = icon('XCircle', 16);
        }
      });
    }

    // Show Explanation
    const expBox = container.querySelector<HTMLElement>('#explanation-box');
    const expIcon = container.querySelector('#exp-status-icon');
    const expStatus = container.querySelector('#exp-status-text');
    const expBody = container.querySelector('#exp-body-text');
    const nextBtn = container.querySelector<HTMLButtonElement>('#btn-next-action');

    if (expBox && expIcon && expStatus && expBody && nextBtn) {
      expBox.style.display = 'block';
      if (isCorrect) {
        expBox.classList.add('exp-correct');
        expIcon.innerHTML = icon('CheckCircle2', 18);
        expStatus.textContent = 'Correct Answer! Great Engineering Intuition.';
      } else {
        expBox.classList.add('exp-incorrect');
        expIcon.innerHTML = icon('AlertCircle', 18);
        expStatus.textContent = selectedIndex === -1 ? 'Time Expired!' : 'Incorrect Choice.';
      }
      expBody.textContent = q.explanation;
      nextBtn.style.display = 'inline-flex';
    }
  }

  async function finishDailyQuiz() {
    if (!activeCategory) return;
    if (timerInterval) clearInterval(timerInterval);

    const totalQ = activeCategory.questions.length;
    const correctCount = userAnswers.filter(a => a.isCorrect).length;
    const accuracy = Math.round((correctCount / totalQ) * 100);
    const totalTime = userAnswers.reduce((acc, a) => acc + a.timeSeconds, 0);

    // Calculate XP
    let xpEarned = 0;
    activeCategory.questions.forEach((q, i) => {
      if (userAnswers[i]?.isCorrect) {
        xpEarned += q.xp;
      }
    });
    if (accuracy >= 80) xpEarned += 100; // Bonus for high accuracy

    // Submit to Turso DB (Separate daily quiz table)
    try {
      await apiSubmitDailyQuiz({
        userId: user.id || 'usr_guest',
        userName: user.name,
        userEmail: user.email,
        quizTopic: activeCategory.title,
        score: correctCount,
        totalQuestions: totalQ,
        xpEarned,
        accuracy,
        timeTakenSeconds: totalTime
      });
    } catch (err) {
      console.error('Failed to submit daily quiz attempt:', err);
    }

    if (accuracy >= 60) {
      launchConfetti();
      soundEngine.playCorrect();
    }

    // Render results
    container.innerHTML = `
      <div class="portal-viewport">
        <header class="portal-header">
          <div class="portal-header-inner">
            <div class="portal-brand">
              <span class="portal-brand-icon">${icon('Award', 22)}</span>
              <div class="portal-brand-text">
                <span class="portal-brand-title">Daily Quiz Completed</span>
                <span class="portal-brand-subtitle">${escapeHtml(activeCategory.title)}</span>
              </div>
            </div>
            <button id="btn-results-portal" class="btn btn-primary btn-pill">
              <span>Back to Portal</span>
              ${icon('ArrowRight', 14)}
            </button>
          </div>
        </header>

        <main class="portal-main-content" style="max-width: 720px; margin: 0 auto;">
          <div class="results-summary-card">
            <div class="results-badge-pill">${accuracy >= 80 ? 'EXEMPLARY SCORE' : accuracy >= 50 ? 'CHALLENGE COMPLETED' : 'PRACTICE COMPLETE'}</div>
            <h1 class="results-score-heading">${correctCount} / ${totalQ} Correct</h1>
            <p class="results-score-desc">
              Your daily quiz performance has been recorded in the Turso Cloud database. Daily streak updated!
            </p>

            <div class="results-stats-row">
              <div class="result-stat-box">
                <span class="stat-icon" style="color: #4f46e5;">${icon('Zap', 18)}</span>
                <span class="stat-number">+${xpEarned} XP</span>
                <span class="stat-label">XP Points Earned</span>
              </div>
              <div class="result-stat-box">
                <span class="stat-icon" style="color: #16a34a;">${icon('Target', 18)}</span>
                <span class="stat-number">${accuracy}%</span>
                <span class="stat-label">Accuracy Rate</span>
              </div>
              <div class="result-stat-box">
                <span class="stat-icon" style="color: #ea580c;">${icon('Flame', 18)}</span>
                <span class="stat-number">${(user.streak || 1) + 1} Days</span>
                <span class="stat-label">New Active Streak</span>
              </div>
              <div class="result-stat-box">
                <span class="stat-icon" style="color: #0284c7;">${icon('Clock', 18)}</span>
                <span class="stat-number">${totalTime}s</span>
                <span class="stat-label">Time Spent</span>
              </div>
            </div>

            <div class="results-actions">
              <button id="btn-try-another-cat" class="btn btn-secondary btn-pill">
                <span>${icon('RotateCcw', 14)} Try Another Daily Quiz</span>
              </button>
              <button id="btn-goto-portal-finish" class="btn btn-primary btn-pill">
                <span>Return to Engineering Portal</span>
                ${icon('ArrowRight', 14)}
              </button>
            </div>
          </div>
        </main>
      </div>
    `;

    container.querySelector('#btn-results-portal')?.addEventListener('click', () => {
      soundEngine.playClick();
      onNavigate('portal');
    });

    container.querySelector('#btn-goto-portal-finish')?.addEventListener('click', () => {
      soundEngine.playClick();
      onNavigate('portal');
    });

    container.querySelector('#btn-try-another-cat')?.addEventListener('click', () => {
      soundEngine.playClick();
      renderCategorySelector();
    });
  }

  // Initial render
  renderCategorySelector();
}

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
