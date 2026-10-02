import './styles/tokens.css';
import './styles/main.css';
import './styles/auth.css';

import { soundEngine } from './components/AudioEffects.ts';
import { launchConfetti } from './components/Confetti.ts';
import { showToast } from './components/Toast.ts';

export interface EngiverseUser {
  id?: string;
  name: string;
  email: string;
  mobile?: string;
  branch?: string;
  year?: string;
  discipline?: string;
  avatar: string;
  streak: number;
  xp: number;
  badge: string;
  joinedAt: string;
}

const DEFAULT_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80'
];

export function getLoggedInUser(): EngiverseUser | null {
  const data = localStorage.getItem('engiverse_user');
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function saveUserSession(user: EngiverseUser): void {
  localStorage.setItem('engiverse_user', JSON.stringify(user));
}

export function clearUserSession(): void {
  localStorage.removeItem('engiverse_user');
  sessionStorage.removeItem('engiverse_admin_token');
  sessionStorage.removeItem('engiverse_admin_email');
  sessionStorage.removeItem('engiverse_admin_name');
}

export function logoutUser(): void {
  clearUserSession();
  window.location.reload();
}

document.addEventListener('DOMContentLoaded', () => {
  setupRegistrationPage();
  setupLoginPage();
  setupSocialAuthButtons();
});

/* ==========================================================================
   REGISTRATION PAGE CONTROLLER
   ========================================================================== */
function setupRegistrationPage(): void {
  const form = document.getElementById('register-form') as HTMLFormElement | null;
  if (!form) return;

  const nameInput = document.getElementById('reg-name') as HTMLInputElement | null;
  const emailInput = document.getElementById('reg-email') as HTMLInputElement | null;
  const pwdInput = document.getElementById('reg-password') as HTMLInputElement | null;
  const togglePwdBtn = document.getElementById('toggle-reg-pwd') as HTMLButtonElement | null;
  const termsCheckbox = document.getElementById('reg-terms') as HTMLInputElement | null;
  const disciplineChips = document.querySelectorAll<HTMLElement>('.discipline-chip');

  let selectedDiscipline = 'Computer Science';

  // Discipline chips selection
  disciplineChips.forEach(chip => {
    chip.addEventListener('click', () => {
      soundEngine.playClick();
      disciplineChips.forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      selectedDiscipline = chip.getAttribute('data-discipline') || 'Computer Science';
    });
  });

  // Password visibility toggle
  if (togglePwdBtn && pwdInput) {
    togglePwdBtn.addEventListener('click', () => {
      const isPwd = pwdInput.type === 'password';
      pwdInput.type = isPwd ? 'text' : 'password';
      togglePwdBtn.textContent = isPwd ? 'Hide' : 'Show';
    });
  }

  // Password strength meter
  if (pwdInput) {
    pwdInput.addEventListener('input', () => {
      const val = pwdInput.value;
      updatePasswordStrength(val);
    });
  }

  // Handle Form Submission
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = nameInput?.value.trim() || '';
    const email = emailInput?.value.trim() || '';
    const password = pwdInput?.value || '';
    const agreed = termsCheckbox?.checked || false;

    // Basic Validation
    if (!name) {
      showToast('Please enter your full name or engineer handle.', 'warn');
      nameInput?.focus();
      return;
    }

    if (!email || !email.includes('@') || !email.includes('.')) {
      showToast('Please enter a valid engineering email address.', 'warn');
      emailInput?.focus();
      return;
    }

    if (password.length < 6) {
      showToast('Password should be at least 6 characters.', 'warn');
      pwdInput?.focus();
      return;
    }

    if (!agreed) {
      showToast('Please agree to the Honor Code to register.', 'warn');
      return;
    }

    const newUser: EngiverseUser = {
      name,
      email,
      discipline: selectedDiscipline,
      avatar: DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)],
      streak: 1,
      xp: 250, // Welcome bonus
      badge: `${selectedDiscipline} Initiate`,
      joinedAt: new Date().toLocaleDateString()
    };

    saveUserSession(newUser);
    soundEngine.playCelebration();
    launchConfetti();
    showToast(`Welcome to Engiverse, ${name}! Your terminal is ready.`, 'success');

    setTimeout(() => {
      window.location.href = 'index.html#hero-quiz-container';
    }, 1200);
  });
}

function updatePasswordStrength(pwd: string): void {
  const seg1 = document.getElementById('str-1');
  const seg2 = document.getElementById('str-2');
  const seg3 = document.getElementById('str-3');
  const label = document.getElementById('pwd-str-text');

  if (!seg1 || !seg2 || !seg3 || !label) return;

  // Reset
  seg1.className = 'strength-segment';
  seg2.className = 'strength-segment';
  seg3.className = 'strength-segment';

  if (!pwd) {
    label.textContent = 'Password strength: enter characters';
    return;
  }

  if (pwd.length < 6) {
    seg1.classList.add('active-weak');
    label.textContent = 'Password strength: Weak (min 6 chars)';
  } else if (pwd.length < 10 || !/[0-9]/.test(pwd)) {
    seg1.classList.add('active-medium');
    seg2.classList.add('active-medium');
    label.textContent = 'Password strength: Good';
  } else {
    seg1.classList.add('active-strong');
    seg2.classList.add('active-strong');
    seg3.classList.add('active-strong');
    label.textContent = 'Password strength: Strong (Optimal)';
  }
}

/* ==========================================================================
   LOGIN PAGE CONTROLLER
   ========================================================================== */
function setupLoginPage(): void {
  const form = document.getElementById('login-form') as HTMLFormElement | null;
  if (!form) return;

  const emailInput = document.getElementById('login-email') as HTMLInputElement | null;
  const pwdInput = document.getElementById('login-password') as HTMLInputElement | null;
  const togglePwdBtn = document.getElementById('toggle-login-pwd') as HTMLButtonElement | null;
  const demoFillBtn = document.getElementById('btn-demo-fill');

  // Toggle Password
  if (togglePwdBtn && pwdInput) {
    togglePwdBtn.addEventListener('click', () => {
      const isPwd = pwdInput.type === 'password';
      pwdInput.type = isPwd ? 'text' : 'password';
      togglePwdBtn.textContent = isPwd ? 'Hide' : 'Show';
    });
  }

  // 1-Click Demo Fill
  if (demoFillBtn && emailInput && pwdInput) {
    demoFillBtn.addEventListener('click', () => {
      soundEngine.playClick();
      emailInput.value = 'elena.rostova@quantum.eng';
      pwdInput.value = 'QuantumCore#2026';
      showToast('Grandmaster credentials loaded! Click Sign In.', 'info');
    });
  }

  // Handle Form Submission
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const email = emailInput?.value.trim() || '';
    const password = pwdInput?.value || '';

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

    // Check if matching previous registered user or demo
    const existing = getLoggedInUser();
    let loggedUser: EngiverseUser;

    if (existing && existing.email.toLowerCase() === email.toLowerCase()) {
      loggedUser = existing;
    } else if (email.includes('elena')) {
      loggedUser = {
        name: 'Elena Rostova',
        email: 'elena.rostova@quantum.eng',
        discipline: 'Quantum & Systems',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
        streak: 42,
        xp: 48920,
        badge: 'Grandmaster Engineer',
        joinedAt: '2024-03-12'
      };
    } else {
      loggedUser = {
        name: email.split('@')[0],
        email,
        discipline: 'Computer Science',
        avatar: DEFAULT_AVATARS[0],
        streak: 5,
        xp: 1450,
        badge: 'Core Specialist',
        joinedAt: '2026-01-10'
      };
    }

    saveUserSession(loggedUser);
    soundEngine.playCorrect();
    launchConfetti();
    showToast(`Welcome back, ${loggedUser.name}!`, 'success');

    setTimeout(() => {
      window.location.href = 'index.html#hero-quiz-container';
    }, 1000);
  });
}

/* ==========================================================================
   SOCIAL AUTH BUTTONS (MOCK FAST LOGIN)
   ========================================================================== */
function setupSocialAuthButtons(): void {
  const githubBtns = document.querySelectorAll('.btn-auth-github');
  const googleBtns = document.querySelectorAll('.btn-auth-google');

  githubBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      soundEngine.playClick();
      const mockUser: EngiverseUser = {
        name: 'Alex Rivera (GitHub)',
        email: 'alex.rivera@dev.io',
        discipline: 'Computer Science',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
        streak: 12,
        xp: 3420,
        badge: 'Systems Specialist',
        joinedAt: '2025-08-15'
      };
      saveUserSession(mockUser);
      soundEngine.playCorrect();
      launchConfetti();
      showToast('Authenticated via GitHub! Redirecting to Engiverse...', 'success');
      setTimeout(() => {
        window.location.href = 'index.html#hero-quiz-container';
      }, 1000);
    });
  });

  googleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      soundEngine.playClick();
      const mockUser: EngiverseUser = {
        name: 'Dr. Sarah Chen (Google)',
        email: 'sarah.chen@ai-research.org',
        discipline: 'AI & Deep Learning',
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80',
        streak: 19,
        xp: 6850,
        badge: 'Neural Architect',
        joinedAt: '2025-05-20'
      };
      saveUserSession(mockUser);
      soundEngine.playCorrect();
      launchConfetti();
      showToast('Authenticated via Google! Redirecting to Engiverse...', 'success');
      setTimeout(() => {
        window.location.href = 'index.html#hero-quiz-container';
      }, 1000);
    });
  });
}
