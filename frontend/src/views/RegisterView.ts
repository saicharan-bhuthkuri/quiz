import { soundEngine } from '../components/AudioEffects.ts';
import { launchConfetti } from '../components/Confetti.ts';
import { showToast } from '../components/Toast.ts';
import { saveUserSession } from '../auth.ts';
import { registerUserToTurso } from '../db/turso.ts';
import { icon } from '../components/Icons.ts';
import { apiGetBranches } from '../api/client.ts';

const DEFAULT_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80'
];

export function renderRegisterView(
  container: HTMLElement,
  onNavigate: (view: string) => void
): void {
  container.innerHTML = `
    <div class="auth-page-wrapper">
      <!-- Auth Navigation Bar -->
      <header class="auth-header">
        <div class="container auth-nav">
          <a href="#" class="nav-brand" id="btn-auth-home-logo" aria-label="Engiverse Home">
            <img src="/logo.png" alt="Engiverse Logo" class="brand-logo-img" />
            <span class="brand-name">Engiverse<span class="brand-dot">.</span></span>
          </a>

          <div class="auth-nav-actions">
            <button id="btn-back-to-landing" class="btn btn-secondary btn-pill btn-auth-back">
              <span>${icon('ArrowLeft', 14)} Back</span>
            </button>
            <button id="btn-goto-login-nav" class="btn btn-primary btn-pill btn-auth-toggle desktop-only-inline">
              <span>Log In</span>
            </button>
          </div>
        </div>
      </header>

      <!-- Main Registration Form Container -->
      <main class="auth-main-container">
        <div class="auth-card-split">
          <!-- Left Showcase Panel -->
          <div class="auth-showcase-panel">
            <div>
              <div class="showcase-badge">
                <span class="live-pulse-dot"></span>
                <span>Engiverse Membership</span>
              </div>
              <h2 class="showcase-title">Join 48,000+ Engineers Mastering First Principles.</h2>
              <p class="showcase-desc">
                From computer architecture and transformer attention to VLSI static timing. Accelerate your problem-solving velocity today.
              </p>

              <ul class="showcase-perks-list">
                <li class="perk-item">
                  <div class="perk-icon-wrap">${icon('Zap', 18)}</div>
                  <div class="perk-text-wrap">
                    <strong>Adaptive Skill Engine</strong>
                    <span>Challenges adjust in real-time to match your engineering level.</span>
                  </div>
                </li>
                <li class="perk-item">
                  <div class="perk-icon-wrap">${icon('Swords', 18)}</div>
                  <div class="perk-text-wrap">
                    <strong>1v1 Live Arena Duels</strong>
                    <span>Compete in timed speed battles against engineers worldwide.</span>
                  </div>
                </li>
                <li class="perk-item">
                  <div class="perk-icon-wrap">${icon('Award', 18)}</div>
                  <div class="perk-text-wrap">
                    <strong>Verified LinkedIn Badges</strong>
                    <span>Export cryptographically signed credentials to your portfolio.</span>
                  </div>
                </li>
              </ul>
            </div>

            <div class="showcase-live-stat">
              <span class="live-pulse-dot"></span>
              <span><strong>4,180 engineers</strong> competing in live arenas right now</span>
            </div>
          </div>

          <!-- Right Registration Form Panel -->
          <div class="auth-form-panel">
            <div class="auth-form-header">
              <h1 class="auth-form-title">Create Engineer Account</h1>
              <p class="auth-form-subtitle">Register to unlock full quizzes, arena duels, and skill tracking.</p>
            </div>

            <!-- Form -->
            <form id="ts-register-form" class="auth-form" novalidate>
              <div class="form-group">
                <label class="form-label" for="ts-reg-name">Full Name / Engineer Handle</label>
                <div class="input-wrapper">
                  <span class="input-icon">${icon('User', 16)}</span>
                  <input type="text" id="ts-reg-name" class="auth-input" placeholder="e.g. Maya Lin" required />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="ts-reg-email">Work / Academic Email</label>
                <div class="input-wrapper">
                  <span class="input-icon">${icon('Mail', 16)}</span>
                  <input type="email" id="ts-reg-email" class="auth-input" placeholder="maya.lin@mit.edu" required />
                </div>
              </div>

              <!-- Mobile Number -->
              <div class="form-group">
                <label class="form-label" for="ts-reg-mobile">Mobile Number</label>
                <div class="input-wrapper">
                  <span class="input-icon">${icon('Phone', 16)}</span>
                  <input type="tel" id="ts-reg-mobile" class="auth-input" placeholder="+1 (555) 019-2834" required />
                </div>
              </div>

              <!-- Branch & Year Dropdowns (2-Column) -->
              <div class="form-row-2col">
                <div class="form-group">
                  <label class="form-label" for="ts-reg-branch">Branch</label>
                  <div class="input-wrapper">
                    <span class="input-icon">${icon('GraduationCap', 16)}</span>
                    <select id="ts-reg-branch" class="auth-input auth-select" required>
                      <option value="" disabled selected>Loading branches...</option>
                    </select>
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label" for="ts-reg-year">Year</label>
                  <div class="input-wrapper">
                    <span class="input-icon">${icon('Calendar', 16)}</span>
                    <select id="ts-reg-year" class="auth-input auth-select" required>
                      <option value="" disabled selected>Select Year</option>
                      <option value="1st Year">1st Year (Freshman)</option>
                      <option value="2nd Year">2nd Year (Sophomore)</option>
                      <option value="3rd Year">3rd Year (Junior)</option>
                      <option value="4th Year">4th Year (Senior)</option>
                      <option value="Graduate / Post-Grad">Graduate / Post-Grad</option>
                      <option value="Working Professional">Working Professional</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Password -->
              <div class="form-group">
                <label class="form-label" for="ts-reg-pwd">Create Password</label>
                <div class="input-wrapper">
                  <span class="input-icon">${icon('Lock', 16)}</span>
                  <input type="password" id="ts-reg-pwd" class="auth-input" placeholder="At least 6 characters" required />
                  <button type="button" id="ts-toggle-reg-pwd" class="input-toggle-pwd">Show</button>
                </div>
                <div class="pwd-strength-bar">
                  <div id="ts-str-1" class="strength-segment"></div>
                  <div id="ts-str-2" class="strength-segment"></div>
                  <div id="ts-str-3" class="strength-segment"></div>
                </div>
                <span id="ts-pwd-str-text" class="strength-text">Password strength: enter characters</span>
              </div>

              <div class="form-options-row">
                <label class="checkbox-label" for="ts-reg-terms">
                  <input type="checkbox" id="ts-reg-terms" checked required />
                  <span>I agree to the Honor Code & Terms of Mastery</span>
                </label>
              </div>

              <button type="submit" id="btn-ts-submit-reg" class="btn btn-primary btn-auth-submit">
                <span>Complete Registration & Start Quiz</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </button>
            </form>

            <p class="auth-switch-prompt">
              Already have an account? <a href="#" id="link-switch-to-login" class="auth-switch-link">Log in here ${icon('ArrowRight', 13)}</a>
            </p>
          </div>
        </div>
      </main>

      <footer class="auth-simple-footer">
        <span>© 2026 Engiverse Inc. • Pure Light Aesthetic • Driven in TypeScript</span>
      </footer>
    </div>
  `;

  // --- Attach TypeScript Event Listeners ---

  // Navigation handlers
  const homeLogo = container.querySelector('#btn-auth-home-logo');
  const backLandingBtn = container.querySelector('#btn-back-to-landing');
  const navLoginBtn = container.querySelector('#btn-goto-login-nav');
  const switchLoginLink = container.querySelector('#link-switch-to-login');

  homeLogo?.addEventListener('click', (e) => {
    e.preventDefault();
    soundEngine.playClick();
    onNavigate('landing');
  });

  backLandingBtn?.addEventListener('click', () => {
    soundEngine.playClick();
    onNavigate('landing');
  });

  navLoginBtn?.addEventListener('click', () => {
    soundEngine.playClick();
    onNavigate('login');
  });

  switchLoginLink?.addEventListener('click', (e) => {
    e.preventDefault();
    soundEngine.playClick();
    onNavigate('login');
  });

  // Password toggle
  const pwdInput = container.querySelector<HTMLInputElement>('#ts-reg-pwd');
  const toggleBtn = container.querySelector<HTMLButtonElement>('#ts-toggle-reg-pwd');
  if (toggleBtn && pwdInput) {
    toggleBtn.addEventListener('click', () => {
      const isPwd = pwdInput.type === 'password';
      pwdInput.type = isPwd ? 'text' : 'password';
      toggleBtn.textContent = isPwd ? 'Hide' : 'Show';
    });
  }

  // Password strength meter
  if (pwdInput) {
    pwdInput.addEventListener('input', () => {
      const val = pwdInput.value;
      const s1 = container.querySelector<HTMLElement>('#ts-str-1');
      const s2 = container.querySelector<HTMLElement>('#ts-str-2');
      const s3 = container.querySelector<HTMLElement>('#ts-str-3');
      const text = container.querySelector<HTMLElement>('#ts-pwd-str-text');
      if (!s1 || !s2 || !s3 || !text) return;

      s1.className = 'strength-segment';
      s2.className = 'strength-segment';
      s3.className = 'strength-segment';

      if (!val) {
        text.textContent = 'Password strength: enter characters';
        return;
      }
      if (val.length < 6) {
        s1.classList.add('active-weak');
        text.textContent = 'Password strength: Weak (min 6 characters)';
      } else if (val.length < 10 || !/[0-9]/.test(val)) {
        s1.classList.add('active-medium');
        s2.classList.add('active-medium');
        text.textContent = 'Password strength: Good';
      } else {
        s1.classList.add('active-strong');
        s2.classList.add('active-strong');
        s3.classList.add('active-strong');
        text.textContent = 'Password strength: Strong';
      }
    });
  }

  // Load dynamic branches from backend / database
  const branchSelect = container.querySelector<HTMLSelectElement>('#ts-reg-branch');
  const loadDynamicBranches = async () => {
    try {
      const res = await apiGetBranches();
      if (branchSelect) {
        if (res && res.success && Array.isArray(res.branches) && res.branches.length > 0) {
          branchSelect.innerHTML = `<option value="" disabled selected>Select Branch</option>` +
            res.branches.map(b => {
              const label = b.code ? `${b.name} (${b.code})` : b.name;
              return `<option value="${b.name}">${label}</option>`;
            }).join('');
        } else {
          branchSelect.innerHTML = `<option value="" disabled selected>Select Branch</option>
            <option value="General Engineering">General Engineering</option>`;
        }
      }
    } catch (err) {
      console.warn('Failed to load branches dynamically:', err);
      if (branchSelect) {
        branchSelect.innerHTML = `<option value="" disabled selected>Select Branch</option>
          <option value="General Engineering">General Engineering</option>`;
      }
    }
  };
  loadDynamicBranches();

  // Form Submit
  const form = container.querySelector<HTMLFormElement>('#ts-register-form');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameInput = container.querySelector<HTMLInputElement>('#ts-reg-name');
    const emailInput = container.querySelector<HTMLInputElement>('#ts-reg-email');
    const mobileInput = container.querySelector<HTMLInputElement>('#ts-reg-mobile');
    const yearSelect = container.querySelector<HTMLSelectElement>('#ts-reg-year');
    const terms = container.querySelector<HTMLInputElement>('#ts-reg-terms');
    const submitBtn = container.querySelector<HTMLButtonElement>('#btn-ts-submit-reg');

    const name = nameInput?.value.trim() || '';
    const email = emailInput?.value.trim() || '';
    const mobile = mobileInput?.value.trim() || '';
    const branch = branchSelect?.value || '';
    const year = yearSelect?.value || '';
    const pwd = pwdInput?.value || '';

    if (!name) {
      showToast('Please enter your full name or engineer handle.', 'warn');
      nameInput?.focus();
      return;
    }
    if (!email || !email.includes('@')) {
      showToast('Please enter a valid engineering email address.', 'warn');
      emailInput?.focus();
      return;
    }
    if (!mobile || mobile.length < 7) {
      showToast('Please enter a valid mobile number.', 'warn');
      mobileInput?.focus();
      return;
    }
    if (!branch) {
      showToast('Please select your engineering branch from the dropdown.', 'warn');
      branchSelect?.focus();
      return;
    }
    if (!year) {
      showToast('Please select your current year from the dropdown.', 'warn');
      yearSelect?.focus();
      return;
    }
    if (pwd.length < 6) {
      showToast('Password must be at least 6 characters.', 'warn');
      pwdInput?.focus();
      return;
    }
    if (!terms?.checked) {
      showToast('Please accept the Honor Code to register.', 'warn');
      return;
    }

    const originalBtnContent = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Saving to Turso DB...</span>`;
    }

    try {
      const avatar = DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];
      const dbRes = await registerUserToTurso({
        name,
        email,
        mobile,
        branch,
        year,
        password: pwd,
        avatar
      });

      if (!dbRes.success || !dbRes.user) {
        showToast(dbRes.error || 'Registration failed in Turso DB', 'warn');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnContent;
        }
        return;
      }

      saveUserSession(dbRes.user);
      soundEngine.playCelebration();
      launchConfetti();
      showToast(`Welcome to Engiverse, ${name}! Saved to Turso Database.`, 'success');

      setTimeout(() => {
        onNavigate('portal');
      }, 1000);
    } catch (err: unknown) {
      console.error(err);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnContent;
      }
      showToast('Connection to Turso DB failed. Please check network.', 'warn');
    }
  });
}
