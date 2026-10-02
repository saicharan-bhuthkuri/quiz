import { soundEngine } from '../components/AudioEffects.ts';
import { launchConfetti } from '../components/Confetti.ts';
import { showToast } from '../components/Toast.ts';
import { saveUserSession, EngiverseUser } from '../auth.ts';
import { loginUserFromTurso } from '../db/turso.ts';
import { icon } from '../components/Icons.ts';

export function renderLoginView(
  container: HTMLElement,
  onNavigate: (view: string) => void
): void {
  container.innerHTML = `
    <div class="auth-page-wrapper">
      <!-- Auth Navigation Bar -->
      <header class="auth-header">
        <div class="container auth-nav">
          <a href="#" class="nav-brand" id="btn-login-home-logo" aria-label="Engiverse Home">
            <img src="/logo.png" alt="Engiverse Logo" class="brand-logo-img" />
            <span class="brand-name">Engiverse<span class="brand-dot">.</span></span>
          </a>

          <div class="auth-nav-actions">
            <button id="btn-login-back-landing" class="btn btn-secondary btn-pill btn-auth-back">
              <span>${icon('ArrowLeft', 14)} Back</span>
            </button>
            <button id="btn-login-goto-reg-nav" class="btn btn-primary btn-pill btn-auth-toggle desktop-only-inline">
              <span>Register Free</span>
            </button>
          </div>
        </div>
      </header>

      <!-- Main Login Container -->
      <main class="auth-main-container">
        <div class="auth-card-single">
          <div class="auth-form-header" style="text-align: center;">
            <div style="display: flex; justify-content: center; margin-bottom: 1rem;">
              <img src="/logo.png" alt="Engiverse" class="brand-logo-img" style="width: 52px; height: 52px; box-shadow: var(--shadow-colored);" />
            </div>
            <h1 class="auth-form-title">Welcome Back, Engineer</h1>
            <p class="auth-form-subtitle">Pick up your daily streak and jump into today’s engineering challenges.</p>
          </div>

          <!-- Login Form -->
          <form id="ts-login-form" class="auth-form" novalidate>
            <div class="form-group">
              <label class="form-label" for="ts-login-email">Registered Email</label>
              <div class="input-wrapper">
                <span class="input-icon">${icon('Mail', 16)}</span>
                <input type="email" id="ts-login-email" class="auth-input" placeholder="engineer@domain.com" required />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="ts-login-pwd">Password</label>
              <div class="input-wrapper">
                <span class="input-icon">${icon('Lock', 16)}</span>
                <input type="password" id="ts-login-pwd" class="auth-input" placeholder="Enter your password" required />
                <button type="button" id="ts-toggle-login-pwd" class="input-toggle-pwd">Show</button>
              </div>
            </div>

            <div class="form-options-row">
              <label class="checkbox-label" for="ts-remember-me">
                <input type="checkbox" id="ts-remember-me" checked />
                <span>Remember terminal</span>
              </label>
              <a href="#" id="ts-forgot-pwd" class="form-forgot-link">Forgot password?</a>
            </div>

            <button type="submit" id="btn-ts-submit-login" class="btn btn-primary btn-auth-submit">
              <span>Sign In to Engiverse</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </button>
          </form>

          <p class="auth-switch-prompt">
            Don't have an account yet? <a href="#" id="link-switch-to-reg" class="auth-switch-link">Register Free ${icon('ArrowRight', 13)}</a>
          </p>

          <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px dashed var(--border-color); text-align: center;">
            <a href="#admin-login" id="link-login-goto-admin" class="admin-portal-link" style="font-size: 0.82rem; color: #4f46e5; text-decoration: none; display: inline-flex; align-items: center; gap: 0.35rem; font-weight: 600;">
              ${icon('Shield', 13)} Switch to Administrator Console
            </a>
          </div>
        </div>
      </main>

      <footer class="auth-simple-footer">
        <span>© 2026 Engiverse Inc. • Pure Light Aesthetic • Driven in TypeScript</span>
      </footer>
    </div>
  `;

  // --- Attach TypeScript Event Listeners ---

  const homeLogo = container.querySelector('#btn-login-home-logo');
  const backLandingBtn = container.querySelector('#btn-login-back-landing');
  const navRegBtn = container.querySelector('#btn-login-goto-reg-nav');
  const switchRegLink = container.querySelector('#link-switch-to-reg');
  const adminLink = container.querySelector('#link-login-goto-admin');
  const emailInput = container.querySelector<HTMLInputElement>('#ts-login-email');
  const pwdInput = container.querySelector<HTMLInputElement>('#ts-login-pwd');
  const toggleBtn = container.querySelector<HTMLButtonElement>('#ts-toggle-login-pwd');

  homeLogo?.addEventListener('click', (e) => {
    e.preventDefault();
    soundEngine.playClick();
    onNavigate('landing');
  });

  backLandingBtn?.addEventListener('click', () => {
    soundEngine.playClick();
    onNavigate('landing');
  });

  navRegBtn?.addEventListener('click', () => {
    soundEngine.playClick();
    onNavigate('register');
  });

  switchRegLink?.addEventListener('click', (e) => {
    e.preventDefault();
    soundEngine.playClick();
    onNavigate('register');
  });

  adminLink?.addEventListener('click', (e) => {
    e.preventDefault();
    soundEngine.playClick();
    onNavigate('admin-login');
  });

  // Password toggle
  if (toggleBtn && pwdInput) {
    toggleBtn.addEventListener('click', () => {
      const isPwd = pwdInput.type === 'password';
      pwdInput.type = isPwd ? 'text' : 'password';
      toggleBtn.textContent = isPwd ? 'Hide' : 'Show';
    });
  }

  // Forgot password
  container.querySelector('#ts-forgot-pwd')?.addEventListener('click', (e) => {
    e.preventDefault();
    soundEngine.playClick();
    showToast('A recovery link has been dispatched to your engineering inbox.', 'info');
  });

  // Form Submit
  const form = container.querySelector<HTMLFormElement>('#ts-login-form');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput?.value.trim() || '';
    const password = pwdInput?.value || '';
    const submitBtn = container.querySelector<HTMLButtonElement>('#btn-ts-submit-login');

    if (!email || !email.includes('@')) {
      showToast('Please enter your registered email address.', 'warn');
      emailInput?.focus();
      return;
    }
    if (!password) {
      showToast('Please enter your password.', 'warn');
      pwdInput?.focus();
      return;
    }

    const originalBtn = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Authenticating with Turso DB...</span>`;
    }

    try {
      // 1. Authenticate with Turso Database (with backend bcrypt verification)
      const dbResult = await loginUserFromTurso(email, password);

      if (dbResult.success && dbResult.user) {
        saveUserSession(dbResult.user);

        // If this user is an administrator or superadmin, activate admin session as well
        if (
          dbResult.user.email.toLowerCase() === 'saicharanbhuthkuri468@gmail.com' ||
          dbResult.user.badge.toLowerCase().includes('admin') ||
          dbResult.user.badge.toLowerCase().includes('superadmin')
        ) {
          sessionStorage.setItem('engiverse_admin_token', 'adm_jwt_' + btoa(Date.now().toString()));
          sessionStorage.setItem('engiverse_admin_email', dbResult.user.email);
          sessionStorage.setItem('engiverse_admin_name', dbResult.user.name);
        }

        soundEngine.playCorrect();
        launchConfetti();
        const roleGreeting = dbResult.user.email.toLowerCase() === 'saicharanbhuthkuri468@gmail.com'
          ? 'Superadmin Access Confirmed.'
          : 'Authenticated via Turso DB.';
        showToast(`Welcome back, ${dbResult.user.name}! ${roleGreeting}`, 'success');
        setTimeout(() => onNavigate('portal'), 850);
        return;
      }

      // 2. Fallback check for demo account
      if (email.includes('elena') || email.includes('demo')) {
        const demoUser: EngiverseUser = {
          name: 'Elena Rostova',
          email: 'elena.rostova@quantum.eng',
          mobile: '+1 (555) 019-4820',
          branch: 'Quantum & Systems',
          year: 'Alumni',
          discipline: 'Quantum & Systems',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
          streak: 42,
          xp: 48920,
          badge: 'Grandmaster Engineer',
          joinedAt: '2024-03-12'
        };
        saveUserSession(demoUser);
        soundEngine.playCorrect();
        launchConfetti();
        showToast(`Welcome back, Elena! Demo session loaded.`, 'success');
        setTimeout(() => onNavigate('portal'), 850);
        return;
      }

      // If failed
      showToast(dbResult.error || 'Invalid credentials or account not found in Turso DB.', 'warn');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtn;
      }
    } catch (err: unknown) {
      console.error(err);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtn;
      }
      showToast('Connection error connecting to Turso Cloud DB. Please try again.', 'warn');
    }
  });
}
