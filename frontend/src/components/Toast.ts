import { icon } from './Icons.ts';

/**
 * Toast notification manager for feedback on actions
 */
export function showToast(message: string, type: 'info' | 'success' | 'warn' = 'info'): void {
  let container = document.getElementById('engiverse-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'engiverse-toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast-item toast-${type}`;

  const iconMap = {
    info: icon('Lightbulb', 16),
    success: icon('CheckCircle', 16),
    warn: icon('Zap', 16)
  };

  toast.innerHTML = `
    <span class="toast-icon">${iconMap[type]}</span>
    <span class="toast-message">${message}</span>
  `;

  container.appendChild(toast);

  // Auto remove after 3.2s
  setTimeout(() => {
    toast.classList.add('toast-fadeout');
    setTimeout(() => {
      toast.remove();
      if (container && container.children.length === 0) {
        container.remove();
      }
    }, 300);
  }, 3200);
}
