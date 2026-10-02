import { InteractiveHeroQuiz } from '../components/InteractiveQuiz.ts';
import { DomainExplorer } from '../components/DomainExplorer.ts';
import { LeaderboardSection } from '../components/LeaderboardSection.ts';
import { soundEngine } from '../components/AudioEffects.ts';
import { testimonials, pricingPlans } from '../data/leaderboardData.ts';
import { showToast } from '../components/Toast.ts';
import { launchConfetti } from '../components/Confetti.ts';
import { getLoggedInUser, logoutUser } from '../auth.ts';
import { icon } from '../components/Icons.ts';

export function renderLandingView(
  container: HTMLElement,
  onNavigate: (view: 'landing' | 'register' | 'login' | 'admin-login') => void
): void {
  const user = getLoggedInUser();

  container.innerHTML = `
    <!-- Ambient Background Accents -->
    <div class="ambient-bg-glow" aria-hidden="true"></div>
    <div class="ambient-dot-grid" aria-hidden="true"></div>

    <div id="landing-view">
      <!-- Navigation Bar -->
      <header class="site-navbar" id="navbar">
        <div class="container nav-container">
          <a href="#" class="nav-brand" id="brand-logo" aria-label="Engiverse Home">
            <img src="/logo.png" alt="Engiverse Logo" class="brand-logo-img" />
            <span class="brand-name">Engiverse<span class="brand-dot">.</span></span>
          </a>

          <nav aria-label="Main Navigation">
            <ul class="nav-links">
              <li><a href="#hero-quiz-container" class="nav-link">Live Quiz</a></li>
              <li><a href="#domains" class="nav-link">Universes</a></li>
              <li><a href="#features" class="nav-link">Arena & DNA</a></li>
              <li><a href="#leaderboard" class="nav-link">Leaderboard</a></li>
              <li><a href="#pricing" class="nav-link">Passes</a></li>
              <li><a href="#faq" class="nav-link">FAQ</a></li>
            </ul>
          </nav>

          <div class="nav-actions">
            <!-- Sound Effect Toggle (Desktop) -->
            <button id="btn-sound-toggle" class="sound-toggle-btn desktop-only" title="Toggle audio feedback" aria-label="Toggle Sound Effects">
              ${icon('Volume2', 16)}
            </button>

            <!-- Streak Indicator (Desktop) -->
            <div class="nav-streak-badge desktop-only" title="Current Daily Streak">
              <span>${icon('Flame', 14)}</span>
              <span>7 Days</span>
            </div>

            <!-- Guest Action Buttons (Login & Start Quiz) -->
            <div id="nav-guest-actions" class="nav-guest-actions" style="${user ? 'display: none;' : 'display: flex;'}">
              <button class="btn btn-secondary btn-pill nav-login-btn desktop-only" id="btn-nav-login">
                <span>Log In</span>
              </button>
              <button class="btn btn-primary btn-pill nav-start-btn" id="btn-nav-start-quiz">
                <span>Start Quiz</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </button>
            </div>

            <!-- User Chip (When logged in) -->
            <div id="nav-user-chip" class="nav-user-chip" style="${user ? 'display: flex;' : 'display: none;'}">
              ${
                user
                  ? `
                <div class="user-chip-wrap">
                  <img src="${user.avatar}" alt="${user.name}" class="nav-user-avatar" />
                  <div class="nav-user-info desktop-only">
                    <span class="nav-user-name">${user.name}</span>
                    <span class="nav-user-badge">${icon('Zap', 12)} ${user.badge}</span>
                  </div>
                  <button id="btn-user-logout" class="btn-user-logout" title="Log Out">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  </button>
                </div>
              `
                  : ''
              }
            </div>

            <button class="mobile-menu-toggle" id="mobile-menu-toggle" aria-label="Open Navigation Menu">
              ${icon('Menu', 20)}
            </button>
          </div>
        </div>
      </header>

      <!-- Mobile Navigation Drawer Overlay & Drawer (Placed outside header) -->
      <div class="mobile-drawer-overlay" id="mobile-drawer-overlay"></div>
      <aside class="mobile-drawer" id="mobile-drawer" aria-label="Mobile Navigation">
        <div class="mobile-drawer-header">
          <div class="nav-brand" style="font-size: 1.25rem;">
            <img src="/logo.png" alt="Engiverse Logo" class="brand-logo-img sm" />
            <span class="brand-name">Engiverse<span class="brand-dot">.</span></span>
          </div>
          <button class="mobile-drawer-close" id="mobile-drawer-close" aria-label="Close menu">${icon('X', 20)}</button>
        </div>

        <div class="mobile-drawer-body">
          <div class="mobile-drawer-chips">
            <div class="nav-streak-badge">
              <span>${icon('Flame', 14)}</span>
              <span>7 Days Streak</span>
            </div>
            <button id="btn-sound-toggle-mobile" class="mobile-sound-pill">
              <span>${icon('Volume2', 14)} Sound: On</span>
            </button>
          </div>

          <ul class="mobile-nav-links">
            <li><a href="#hero-quiz-container" class="mobile-nav-link">${icon('Target', 16)} Live Quiz Challenge</a></li>
            <li><a href="#domains" class="mobile-nav-link">${icon('Globe', 16)} 6 Engineering Universes</a></li>
            <li><a href="#features" class="mobile-nav-link">${icon('Zap', 16)} Arena & Knowledge DNA</a></li>
            <li><a href="#leaderboard" class="mobile-nav-link">${icon('Trophy', 16)} Global Leaderboard</a></li>
            <li><a href="#pricing" class="mobile-nav-link">${icon('Award', 16)} Access Passes</a></li>
            <li><a href="#faq" class="mobile-nav-link">${icon('HelpCircle', 16)} Questions & FAQ</a></li>
            <li><a href="#admin-login" class="mobile-nav-link admin-highlight-link" id="mobile-admin-link">${icon('Shield', 16)} Admin Portal</a></li>
          </ul>

          <div class="mobile-drawer-actions">
            ${
              user
                ? `
              <div class="mobile-user-card">
                <img src="${user.avatar}" alt="${user.name}" class="nav-user-avatar" style="width: 38px; height: 38px;" />
                <div>
                  <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-main);">${user.name}</div>
                  <div style="font-size: 0.75rem; color: var(--primary-color); font-weight: 600;">${icon('Zap', 12)} ${user.badge} • ${user.xp} XP</div>
                </div>
                <button id="btn-mobile-logout" class="btn btn-secondary" style="margin-left: auto; padding: 0.4rem 0.8rem; font-size: 0.8rem;">Log Out</button>
              </div>
            `
                : `
              <button class="btn btn-secondary" id="btn-mobile-login" style="width: 100%; justify-content: center; padding: 0.75rem;">
                <span>Log In to Account</span>
              </button>
              <button class="btn btn-primary" id="btn-mobile-start-quiz" style="width: 100%; justify-content: center; padding: 0.85rem;">
                <span>Start Free Quiz</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </button>
            `
            }
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <main>
        <!-- HERO SECTION -->
        <section class="hero-section" id="hero">
          <div class="container hero-grid">
            <!-- Left Hero Copy -->
            <div class="hero-content">
              <div class="hero-eyebrow">
                <span class="live-pulse-dot"></span>
                <span>The Universe of Engineering Challenges</span>
              </div>

              <h1 class="hero-title">
                Sharpen Your Engineering Mind. <br />
                <span class="gradient-text">One Challenge at a Time.</span>
              </h1>

              <p class="hero-subtitle">
                Tired of trivia? Engiverse tests actual production architecture, transformer math, CMOS timing, and kinematics. Compete in live 1v1 arenas, map your Knowledge DNA, and dominate technical interviews.
              </p>

              <div class="hero-cta-group">
                <button class="btn btn-primary" id="btn-hero-start-quiz">
                  <span>Start Quiz (Diagnostic Test)</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </button>
                <a href="#domains" class="btn btn-secondary">
                  <span>Explore 6 Universes</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                </a>
              </div>

              <div class="hero-active-users">
                <span class="live-pulse-dot"></span>
                <span><strong>4,180 engineers</strong> solving challenges right now</span>
              </div>

              <div class="hero-metrics-row">
                <div class="hero-metric-item">
                  <span class="metric-number">500+</span>
                  <span class="metric-label">Engineering Challenges</span>
                </div>
                <div class="hero-metric-item">
                  <span class="metric-number">98.4%</span>
                  <span class="metric-label">Concept Mastery Rate</span>
                </div>
                <div class="hero-metric-item">
                  <span class="metric-number">48k+</span>
                  <span class="metric-label">Global Competitors</span>
                </div>
              </div>
            </div>

            <!-- Right Hero Interactive Quiz -->
            <div class="hero-quiz-wrapper">
              <div id="hero-quiz-container"></div>
            </div>
          </div>
        </section>

        <!-- GAMIFICATION & PLATFORM FEATURES -->
        <section class="features-section" id="features">
          <div class="container">
            <div class="section-header">
              <span class="section-eyebrow">Engineered for Mastery</span>
              <h2 class="section-title">Beyond Ordinary Multiple Choice</h2>
              <p class="section-subtitle">
                Built from first principles to reflect real engineering challenges, mental models, and production failure modes.
              </p>
            </div>

            <div class="features-grid">
              <div class="feature-pillar-card">
                <div class="feature-pillar-icon">${icon('Zap', 28)}</div>
                <h3 class="feature-pillar-title">Adaptive Difficulty</h3>
                <p class="feature-pillar-desc">
                  Questions calibrate dynamically based on your solution velocity and conceptual accuracy. Never get bored with basics or stuck on impossible math.
                </p>
                <span class="feature-highlight-tag">
                  <span>Elo-based Calibration</span> ${icon('ArrowRight', 14)}
                </span>
              </div>

              <div class="feature-pillar-card">
                <div class="feature-pillar-icon">${icon('Swords', 28)}</div>
                <h3 class="feature-pillar-title">1v1 Live Arena</h3>
                <p class="feature-pillar-desc">
                  Go head-to-head with engineers worldwide in 60-second speed duels. Test your intuition under high-pressure simulated interview clocks.
                </p>
                <span class="feature-highlight-tag">
                  <span>Real-time Socket Duels</span> ${icon('ArrowRight', 14)}
                </span>
              </div>

              <div class="feature-pillar-card">
                <div class="feature-pillar-icon">${icon('Dna', 28)}</div>
                <h3 class="feature-pillar-title">Knowledge DNA Radar</h3>
                <p class="feature-pillar-desc">
                  Pinpoint precise knowledge blindspots across concurrency, circuits, neural weights, and cache architectures with multidimensional analytics.
                </p>
                <span class="feature-highlight-tag">
                  <span>Sub-topic Diagnostics</span> ${icon('ArrowRight', 14)}
                </span>
              </div>

              <div class="feature-pillar-card">
                <div class="feature-pillar-icon">${icon('Award', 28)}</div>
                <h3 class="feature-pillar-title">Verified Badges</h3>
                <p class="feature-pillar-desc">
                  Earn cryptographically signed credentials upon completing master-level domain tracks. Share directly on LinkedIn and your engineering portfolio.
                </p>
                <span class="feature-highlight-tag">
                  <span>Industry Recognized</span> ${icon('ArrowRight', 14)}
                </span>
              </div>
            </div>
          </div>
        </section>

        <!-- DOMAIN CONSTELLATION SECTION -->
        <section class="domains-section" id="domains">
          <div class="container">
            <div class="section-header">
              <span class="section-eyebrow">Domain Constellation</span>
              <h2 class="section-title">Explore Engineering Universes</h2>
              <p class="section-subtitle">
                Filter by your specialty, inspect sample challenges with full explanations, or launch an immediate domain diagnostic.
              </p>
            </div>

            <div id="domain-explorer-container"></div>
          </div>
        </section>

        <!-- LEADERBOARD & LIVE DISPATCH -->
        <section class="leaderboard-section" id="leaderboard">
          <div class="container">
            <div class="section-header">
              <span class="section-eyebrow">Global Arena</span>
              <h2 class="section-title">Where Elite Engineers Benchmark</h2>
              <p class="section-subtitle">
                Compete for the weekly championship podium, earn XP multipliers, and maintain your streak to climb the ranks.
              </p>
            </div>

            <div id="leaderboard-container"></div>
          </div>
        </section>

        <!-- TESTIMONIALS SECTION -->
        <section class="testimonials-section" id="testimonials">
          <div class="container">
            <div class="section-header">
              <span class="section-eyebrow">Peer Proof</span>
              <h2 class="section-title">Endorsed by Top Engineers</h2>
              <p class="section-subtitle">
                See how practicing on Engiverse transformed interview outcomes and engineering depth.
              </p>
            </div>

            <div class="testimonials-grid" id="testimonials-grid"></div>
          </div>
        </section>

        <!-- PRICING & MEMBERSHIP PASSES -->
        <section class="pricing-section" id="pricing">
          <div class="container">
            <div class="section-header">
              <span class="section-eyebrow">Flexible Passes</span>
              <h2 class="section-title">Accelerate Your Engineering Career</h2>
              <p class="section-subtitle">
                Start free or upgrade to Pro to unlock unlimited speed duels, deep architecture visualizers, and verified certificates.
              </p>
            </div>

            <!-- Billing Cycle Toggle -->
            <div class="billing-toggle-wrapper">
              <span class="billing-label">Monthly</span>
              <div class="billing-toggle-switch" id="billing-switch" role="switch" aria-checked="false" tabindex="0">
                <div class="toggle-slider"></div>
              </div>
              <span class="billing-label">Annual Billing</span>
              <span class="discount-pill">Save 25%</span>
            </div>

            <div class="pricing-grid" id="pricing-grid"></div>
          </div>
        </section>

        <!-- FAQ SECTION -->
        <section class="faq-section" id="faq">
          <div class="container">
            <div class="section-header">
              <span class="section-eyebrow">Got Questions?</span>
              <h2 class="section-title">Frequently Asked Questions</h2>
              <p class="section-subtitle">
                Everything you need to know about questions, scoring, difficulty calibration, and enterprise access.
              </p>
            </div>

            <div class="faq-list" id="faq-list">
              <div class="faq-item open">
                <button class="faq-question-btn">
                  <span>How are Engiverse questions created and verified?</span>
                  <span class="faq-toggle-icon">${icon('Plus', 16)}</span>
                </button>
                <div class="faq-answer-panel">
                  <p class="faq-answer-text">
                    Every quiz question is authored by domain specialists (staff engineers, PhD researchers, and verified faculty) and peer-reviewed against real production trade-offs. We avoid pure syntax trivia in favor of deep conceptual logic, timing constraints, and failure modes.
                  </p>
                </div>
              </div>

              <div class="faq-item">
                <button class="faq-question-btn">
                  <span>Is Engiverse suitable for technical interview preparation?</span>
                  <span class="faq-toggle-icon">${icon('Plus', 16)}</span>
                </button>
                <div class="faq-answer-panel">
                  <p class="faq-answer-text">
                    Yes! Hundreds of candidates use our Computer Systems, Distributed Architecture, and AI/ML tracks to prep for L5/L6 senior engineering rounds at major tech companies and semiconductor firms.
                  </p>
                </div>
              </div>

              <div class="faq-item">
                <button class="faq-question-btn">
                  <span>How does the 1v1 Live Arena matchmaking work?</span>
                  <span class="faq-toggle-icon">${icon('Plus', 16)}</span>
                </button>
                <div class="faq-answer-panel">
                  <p class="faq-answer-text">
                    The Live Arena pairs you with players possessing similar Elo ratings in your selected domain. Both competitors receive the same synchronized questions with a 60-second clock, scoring points based on both correctness and speed.
                  </p>
                </div>
              </div>

              <div class="faq-item">
                <button class="faq-question-btn">
                  <span>Can universities or engineering bootcamps use Engiverse?</span>
                  <span class="faq-toggle-icon">${icon('Plus', 16)}</span>
                </button>
                <div class="faq-answer-panel">
                  <p class="faq-answer-text">
                    Yes, our Campus & Teams pass provides private leaderboards, cohort progress tracking, instructor analytics dashboards, and custom problem bank integration for classrooms and corporate engineering teams.
                  </p>
                </div>
              </div>

              <div class="faq-item">
                <button class="faq-question-btn">
                  <span>Are the certificates and skill badges shareable?</span>
                  <span class="faq-toggle-icon">${icon('Plus', 16)}</span>
                </button>
                <div class="faq-answer-panel">
                  <p class="faq-answer-text">
                    All certificates earned upon completing track milestones include a unique verifiable cryptographic URL that can be embedded into your LinkedIn profile, CV, or portfolio website.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <!-- FOOTER -->
      <footer class="site-footer">
        <div class="container">
          <div class="footer-top-grid">
            <!-- Brand Col -->
            <div class="footer-brand-col">
              <a href="#" class="nav-brand" id="footer-brand-logo">
                <img src="/logo.png" alt="Engiverse Logo" class="brand-logo-img" />
                <span class="brand-name">Engiverse<span class="brand-dot">.</span></span>
              </a>
              <p>
                The premier interactive quiz and arena platform for mastering core engineering principles across computer systems, AI, electronics, and robotics.
              </p>
              <div class="footer-status-pill">
                <span class="live-pulse-dot"></span>
                <span>All 6 Universes Operational</span>
              </div>
            </div>

            <!-- Universes Col -->
            <div class="footer-nav-col">
              <h4 class="footer-col-title">Universes</h4>
              <ul class="footer-nav-list">
                <li><a href="#domains" class="footer-nav-link">Computer Systems</a></li>
                <li><a href="#domains" class="footer-nav-link">AI & Deep Learning</a></li>
                <li><a href="#domains" class="footer-nav-link">VLSI & Circuits</a></li>
                <li><a href="#domains" class="footer-nav-link">Robotics & Control</a></li>
                <li><a href="#domains" class="footer-nav-link">Cloud Architecture</a></li>
                <li><a href="#domains" class="footer-nav-link">Quantum Systems</a></li>
              </ul>
            </div>

            <!-- Platform Col -->
            <div class="footer-nav-col">
              <h4 class="footer-col-title">Platform</h4>
              <ul class="footer-nav-list">
                <li><a href="#" class="footer-nav-link" id="footer-link-register">Engineer Registration</a></li>
                <li><a href="#" class="footer-nav-link" id="footer-link-login">Engineer Sign In</a></li>
                <li><a href="#leaderboard" class="footer-nav-link">Weekly Arena</a></li>
                <li><a href="#features" class="footer-nav-link">Knowledge DNA</a></li>
                <li><a href="#pricing" class="footer-nav-link">Pro Membership</a></li>
                <li><a href="#faq" class="footer-nav-link">Help & FAQs</a></li>
                <li><a href="#admin-login" class="footer-nav-link admin-highlight-link" id="footer-link-admin">${icon('Shield', 15)} Admin Portal</a></li>
              </ul>
            </div>

            <!-- Newsletter Col -->
            <div class="footer-newsletter-col">
              <h4 class="footer-col-title">Weekly Brain Teaser</h4>
              <div class="newsletter-box">
                <p>Get one challenging engineering brain-teaser and deep architectural breakdown in your inbox every Tuesday.</p>
                <form id="newsletter-form" class="newsletter-form" onsubmit="return false;">
                  <input type="email" id="newsletter-email" class="newsletter-input" placeholder="engineer@domain.com" required aria-label="Email Address" />
                  <button type="submit" id="btn-newsletter-submit" class="btn btn-primary">
                    Subscribe
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div class="footer-bottom-row">
            <span>© 2026 Engiverse Inc. All engineering rights reserved.</span>
            <span>100% TypeScript Architecture • Pure Light Aesthetic</span>
          </div>
        </div>
      </footer>
    </div>
  `;

  // --- Attach TypeScript Components & Event Handlers ---

  // 1. Navigation routing events: "Start Quiz" -> Registration, "Log In" -> Login
  const handleStartQuiz = () => {
    soundEngine.playClick();
    const currentUser = getLoggedInUser();
    if (currentUser) {
      document.getElementById('hero-quiz-container')?.scrollIntoView({ behavior: 'smooth' });
      showToast(`Welcome back, ${currentUser.name}! Terminal active.`, 'info');
    } else {
      onNavigate('register');
    }
  };

  const handleLogin = () => {
    soundEngine.playClick();
    onNavigate('login');
  };

  const handleAdmin = () => {
    soundEngine.playClick();
    onNavigate('admin-login');
  };

  container.querySelector('#btn-nav-start-quiz')?.addEventListener('click', handleStartQuiz);
  container.querySelector('#btn-hero-start-quiz')?.addEventListener('click', handleStartQuiz);
  container.querySelector('#footer-link-register')?.addEventListener('click', (e) => {
    e.preventDefault();
    handleStartQuiz();
  });

  container.querySelector('#btn-nav-login')?.addEventListener('click', handleLogin);
  container.querySelector('#footer-link-login')?.addEventListener('click', (e) => {
    e.preventDefault();
    handleLogin();
  });

  container.querySelector('#footer-link-admin')?.addEventListener('click', (e) => {
    e.preventDefault();
    handleAdmin();
  });

  // Logout handler
  container.querySelector('#btn-user-logout')?.addEventListener('click', () => {
    soundEngine.playClick();
    logoutUser();
    showToast('Signed out of terminal.', 'info');
  });

  // 2. Initialize in-hero Interactive Quiz
  new InteractiveHeroQuiz('hero-quiz-container');

  // 3. Initialize Domain Explorer
  new DomainExplorer('domain-explorer-container');

  // 4. Initialize Leaderboard
  new LeaderboardSection('leaderboard-container');

  // 5. Render Testimonials
  renderTestimonials(container);

  // 6. Setup Pricing & Billing switch
  setupPricing(container);

  // 7. Setup FAQ Accordion
  setupFAQ(container);

  // 8. Setup Sound FX Toggle Button
  setupSoundToggle(container);

  // 9. Setup Newsletter Form
  setupNewsletter(container);

  // 10. Mobile Menu Toggle & Drawer
  setupMobileMenu(container, onNavigate, handleStartQuiz, handleLogin);
}

function renderTestimonials(container: HTMLElement): void {
  const grid = container.querySelector('#testimonials-grid');
  if (!grid) return;

  grid.innerHTML = testimonials
    .map(
      t => `
      <div class="testimonial-card">
        <div class="testimonial-stars">${Array(5).fill(icon('Star', { size: 15, fill: '#f59e0b', color: '#f59e0b' })).join('')}</div>
        <p class="testimonial-quote">"${escapeHtml(t.quote)}"</p>
        <div class="testimonial-author">
          <img src="${t.avatar}" alt="${t.name}" class="author-avatar" />
          <div class="author-info">
            <span class="author-name">${t.name}</span>
            <span class="author-role">${t.role} • ${t.company}</span>
          </div>
        </div>
      </div>
    `
    )
    .join('');
}

function setupPricing(container: HTMLElement): void {
  const switchEl = container.querySelector('#billing-switch');
  const pricingGrid = container.querySelector('#pricing-grid');
  if (!pricingGrid) return;

  let isAnnual = false;

  function renderCards(): void {
    if (!pricingGrid) return;
    pricingGrid.innerHTML = pricingPlans
      .map(plan => {
        const price = isAnnual ? plan.priceAnnual : plan.priceMonthly;
        return `
        <div class="pricing-card ${plan.popular ? 'popular' : ''}">
          ${plan.badge ? `<span class="card-top-pill">${plan.badge}</span>` : ''}
          <h3 class="plan-name">${plan.name}</h3>
          <p class="plan-desc">${plan.description}</p>
          
          <div class="plan-price-wrap">
            <span class="plan-currency">$</span>
            <span class="plan-price">${price}</span>
            <span class="plan-period">/ month ${isAnnual && price > 0 ? '(billed annually)' : ''}</span>
          </div>

          <ul class="plan-features-list">
            ${plan.features
              .map(
                f => `
              <li class="feature-check-item">
                <span class="check-icon">${icon('Check', 14)}</span>
                <span>${f}</span>
              </li>
            `
              )
              .join('')}
          </ul>

          <button class="btn ${plan.popular ? 'btn-primary' : 'btn-secondary'} btn-plan-select" data-plan="${plan.id}">
            ${plan.ctaText}
          </button>
        </div>
      `;
      })
      .join('');

    pricingGrid.querySelectorAll<HTMLButtonElement>('.btn-plan-select').forEach(btn => {
      btn.addEventListener('click', () => {
        soundEngine.playClick();
        const planId = btn.getAttribute('data-plan');
        launchConfetti();
        showToast(`Selected ${planId?.toUpperCase()} tier pass! Welcome to Engiverse.`, 'success');
      });
    });
  }

  renderCards();

  if (switchEl) {
    const handleToggle = () => {
      soundEngine.playClick();
      isAnnual = !isAnnual;
      switchEl.classList.toggle('annual', isAnnual);
      switchEl.setAttribute('aria-checked', String(isAnnual));
      renderCards();
    };

    switchEl.addEventListener('click', handleToggle);
    switchEl.addEventListener('keydown', (e) => {
      const event = e as KeyboardEvent;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleToggle();
      }
    });
  }
}

function setupFAQ(container: HTMLElement): void {
  const faqList = container.querySelector('#faq-list');
  if (!faqList) return;

  const items = faqList.querySelectorAll<HTMLElement>('.faq-item');
  items.forEach(item => {
    const btn = item.querySelector<HTMLButtonElement>('.faq-question-btn');
    btn?.addEventListener('click', () => {
      soundEngine.playClick();
      const isOpen = item.classList.contains('open');
      items.forEach(i => i.classList.remove('open'));
      if (!isOpen) {
        item.classList.add('open');
      }
    });
  });
}

function setupSoundToggle(container: HTMLElement): void {
  const btn = container.querySelector('#btn-sound-toggle') as HTMLButtonElement | null;
  if (!btn) return;

  const updateUI = () => {
    const isMuted = soundEngine.getMuted();
    btn.innerHTML = isMuted ? icon('VolumeX', 18) : icon('Volume2', 18);
    btn.setAttribute('title', isMuted ? 'Sound Effects: Muted' : 'Sound Effects: Active');
  };

  updateUI();

  btn.addEventListener('click', () => {
    const isMuted = soundEngine.toggleMute();
    updateUI();
    if (!isMuted) {
      soundEngine.playClick();
      showToast('Sound effects enabled', 'info');
    } else {
      showToast('Sound effects muted', 'info');
    }
  });
}

function setupNewsletter(container: HTMLElement): void {
  const form = container.querySelector('#newsletter-form') as HTMLFormElement | null;
  const input = container.querySelector('#newsletter-email') as HTMLInputElement | null;

  if (form && input) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = input.value.trim();
      if (!email || !email.includes('@')) {
        showToast('Please enter a valid engineering email address.', 'warn');
        return;
      }
      soundEngine.playCelebration();
      launchConfetti();
      showToast(`Subscribed! First engineering brain teaser on the way to ${email}`, 'success');
      input.value = '';
    });
  }
}

function setupMobileMenu(
  container: HTMLElement,
  onNavigate: (view: 'landing' | 'register' | 'login' | 'admin-login') => void,
  handleStartQuiz: () => void,
  handleLogin: () => void
): void {
  const toggleBtn = container.querySelector('#mobile-menu-toggle');
  const drawer = container.querySelector('#mobile-drawer');
  const overlay = container.querySelector('#mobile-drawer-overlay');
  const closeBtn = container.querySelector('#mobile-drawer-close');

  const openDrawer = () => {
    soundEngine.playClick();
    drawer?.classList.add('open');
    overlay?.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  const closeDrawer = () => {
    drawer?.classList.remove('open');
    overlay?.classList.remove('open');
    document.body.style.overflow = '';
  };

  toggleBtn?.addEventListener('click', openDrawer);
  closeBtn?.addEventListener('click', closeDrawer);
  overlay?.addEventListener('click', closeDrawer);

  // Close when clicking any nav link
  drawer?.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', () => {
      soundEngine.playClick();
      closeDrawer();
    });
  });

  // Action buttons inside mobile drawer
  container.querySelector('#btn-mobile-login')?.addEventListener('click', () => {
    closeDrawer();
    handleLogin();
  });

  container.querySelector('#btn-mobile-start-quiz')?.addEventListener('click', () => {
    closeDrawer();
    handleStartQuiz();
  });

  container.querySelector('#mobile-admin-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    closeDrawer();
    onNavigate('admin-login');
  });

  container.querySelector('#btn-mobile-logout')?.addEventListener('click', () => {
    soundEngine.playClick();
    logoutUser();
    closeDrawer();
    showToast('Signed out of terminal.', 'info');
    onNavigate('landing');
  });

  // Mobile sound toggle pill
  const soundBtnMobile = container.querySelector('#btn-sound-toggle-mobile') as HTMLButtonElement | null;
  if (soundBtnMobile) {
    const updateMobileSoundUI = () => {
      const isMuted = soundEngine.getMuted();
      soundBtnMobile.innerHTML = isMuted ? `<span>${icon('VolumeX', 14)} Sound: Muted</span>` : `<span>${icon('Volume2', 14)} Sound: On</span>`;
    };
    updateMobileSoundUI();
    soundBtnMobile.addEventListener('click', () => {
      const isMuted = soundEngine.toggleMute();
      updateMobileSoundUI();
      const desktopSound = container.querySelector('#btn-sound-toggle');
      if (desktopSound) desktopSound.innerHTML = isMuted ? icon('VolumeX', 18) : icon('Volume2', 18);
      showToast(isMuted ? 'Sound muted' : 'Sound active', 'info');
    });
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
