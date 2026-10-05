import { apiAdminLogin } from '../api/client.ts';
import { soundEngine } from '../components/AudioEffects.ts';
import { showToast } from '../components/Toast.ts';
import { icon } from '../components/Icons.ts';

export function renderAdminLoginView(
  container: HTMLElement,
  onNavigate: (view: 'landing' | 'register' | 'login' | 'admin-dashboard') => void
): void {
  container.innerHTML = `
    <div class="auth-page-wrapper">
      <!-- Admin Top Navbar -->
      <header class="auth-header">
        <div class="container auth-nav">
          <a href="#" class="nav-brand" id="admin-login-home" aria-label="Engiverse Home">
            <img src="/logo.png" alt="Engiverse Logo" class="brand-logo-img" />
            <span class="brand-name">Engiverse<span class="brand-dot">.</span></span>
          </a>

          <button id="btn-back-to-engineer-portal" class="btn btn-secondary btn-pill btn-auth-back">
            <span>${icon('ArrowLeft', 14)} Engineer Portal</span>
          </button>
        </div>
      </header>

      <main class="auth-main-container">
        <div class="auth-card-single">
          <div class="auth-form-header" style="text-align: center;">
            <div style="display: flex; justify-content: center; margin-bottom: 0.75rem;">
              <img src="/logo.png" alt="Engiverse" class="brand-logo-img" style="width: 50px; height: 50px; box-shadow: var(--shadow-colored);" />
            </div>
            <div class="showcase-badge" style="margin: 0 auto 0.75rem auto;">
              <span>${icon('Shield', 14)} RESTRICTED ACCESS</span>
            </div>
            <h1 class="auth-form-title">Admin Console Login</h1>
            <p class="auth-form-subtitle">Manage users, view real-time Turso database metrics, and control platform records.</p>
          </div>

          <form id="admin-login-form" class="auth-form" novalidate>
            <div class="form-group">
              <label class="form-label" for="admin-email">Admin Email</label>
              <div class="input-wrapper">
                <span class="input-icon">${icon('Shield', 16)}</span>
                <input type="email" id="admin-email" class="auth-input" placeholder="Enter authorized admin email" required />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="admin-pwd">Admin Security Key</label>
              <div class="input-wrapper">
                <span class="input-icon">${icon('Lock', 16)}</span>
                <input type="password" id="admin-pwd" class="auth-input" placeholder="Enter master security key" required />
                <button type="button" id="toggle-admin-pwd" class="input-toggle-pwd">Show</button>
              </div>
            </div>

            <button type="submit" id="btn-submit-admin-login" class="btn btn-primary btn-auth-submit">
              <span>Authenticate to Dashboard</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </button>
          </form>
        </div>
      </main>

      <footer class="auth-simple-footer">
        <span>© 2026 Engiverse Admin Infrastructure • Secure Turso Cloud Engine</span>
      </footer>
    </div>
  `;

  // Listeners
  const homeBtn = container.querySelector('#admin-login-home');
  const backBtn = container.querySelector('#btn-back-to-engineer-portal');
  const emailInput = container.querySelector<HTMLInputElement>('#admin-email');
  const pwdInput = container.querySelector<HTMLInputElement>('#admin-pwd');
  const toggleBtn = container.querySelector<HTMLButtonElement>('#toggle-admin-pwd');
  const form = container.querySelector<HTMLFormElement>('#admin-login-form');
  const submitBtn = container.querySelector<HTMLButtonElement>('#btn-submit-admin-login');

  homeBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    soundEngine.playClick();
    onNavigate('landing');
  });

  backBtn?.addEventListener('click', () => {
    soundEngine.playClick();
    onNavigate('landing');
  });

  if (toggleBtn && pwdInput) {
    toggleBtn.addEventListener('click', () => {
      const isPwd = pwdInput.type === 'password';
      pwdInput.type = isPwd ? 'text' : 'password';
      toggleBtn.textContent = isPwd ? 'Hide' : 'Show';
    });
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput?.value.trim() || '';
    const password = pwdInput?.value || '';

    if (!email || !password) {
      showToast('Please enter both admin email and security key.', 'warn');
      return;
    }

    const origContent = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Verifying Credentials...</span>';
    }

    try {
      const res = await apiAdminLogin(email, password);
      if (res.success && res.admin) {
        sessionStorage.setItem('engiverse_admin_token', res.admin.token);
        sessionStorage.setItem('engiverse_admin_email', res.admin.email);
        sessionStorage.setItem('engiverse_admin_name', res.admin.name);
        sessionStorage.setItem('engiverse_admin_role', res.admin.role || 'ADMIN');
        soundEngine.playCorrect();
        showToast('Admin access granted! Loading dashboard...', 'success');
        setTimeout(() => onNavigate('admin-dashboard'), 700);
      } else {
        showToast(res.error || 'Invalid admin credentials.', 'warn');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origContent;
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to connect to backend API server.', 'warn');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origContent;
      }
    }
  });
}
