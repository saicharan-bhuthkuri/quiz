import { soundEngine } from './AudioEffects.ts';
import { icon } from './Icons.ts';

export interface ConfirmDialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  iconName?: string;
}

class ConfirmDialogManager {
  private overlay: HTMLElement | null = null;
  private resolveFn: ((value: boolean) => void) | null = null;

  constructor() {
    this.createDom();
  }

  private createDom(): void {
    if (typeof document === 'undefined') return;
    if (document.getElementById('engiverse-confirm-dialog')) {
      this.overlay = document.getElementById('engiverse-confirm-dialog');
      return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'engiverse-confirm-dialog';
    overlay.className = 'confirm-dialog-overlay hidden';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'confirm-dialog-title');
    overlay.setAttribute('aria-describedby', 'confirm-dialog-desc');

    overlay.innerHTML = `
      <div class="confirm-dialog-card" id="confirm-dialog-card">
        <div class="confirm-dialog-accent-bar danger" id="confirm-dialog-accent"></div>
        <div class="confirm-dialog-icon-wrapper danger" id="confirm-dialog-icon-wrap">
          <div class="confirm-dialog-icon-halo"></div>
          <div class="confirm-dialog-icon-inner" id="confirm-dialog-icon-inner">
            ${icon('Trash2', 26)}
          </div>
        </div>
        
        <div class="confirm-dialog-content">
          <h3 id="confirm-dialog-title" class="confirm-dialog-title">Confirm Action</h3>
          <p id="confirm-dialog-desc" class="confirm-dialog-desc"></p>
        </div>

        <div class="confirm-dialog-actions">
          <button type="button" id="confirm-dialog-btn-cancel" class="confirm-btn confirm-btn-cancel">
            Cancel
          </button>
          <button type="button" id="confirm-dialog-btn-confirm" class="confirm-btn confirm-btn-danger">
            Confirm
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.overlay = overlay;

    // Attach listeners
    const cancelBtn = overlay.querySelector<HTMLButtonElement>('#confirm-dialog-btn-cancel');
    const confirmBtn = overlay.querySelector<HTMLButtonElement>('#confirm-dialog-btn-confirm');

    cancelBtn?.addEventListener('click', () => {
      soundEngine.playClick();
      this.handleResolve(false);
    });

    confirmBtn?.addEventListener('click', () => {
      soundEngine.playClick();
      this.handleResolve(true);
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.handleResolve(false);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (overlay && !overlay.classList.contains('hidden')) {
        if (e.key === 'Escape') {
          e.preventDefault();
          this.handleResolve(false);
        }
      }
    });
  }

  private handleResolve(value: boolean): void {
    if (!this.overlay) return;
    this.overlay.classList.add('hidden');
    document.body.style.overflow = '';
    if (this.resolveFn) {
      const fn = this.resolveFn;
      this.resolveFn = null;
      fn(value);
    }
  }

  public confirm(options: ConfirmDialogOptions | string): Promise<boolean> {
    return new Promise((resolve) => {
      this.resolveFn = resolve;
      if (!this.overlay) this.createDom();
      if (!this.overlay) {
        resolve(false);
        return;
      }

      const opts: ConfirmDialogOptions = typeof options === 'string' ? { message: options } : options;
      const type = opts.type || 'danger';
      const title = opts.title || (type === 'danger' ? 'Confirm Deletion' : type === 'warning' ? 'Warning' : 'Confirmation');
      const confirmText = opts.confirmText || (type === 'danger' ? 'Delete' : 'Confirm');
      const cancelText = opts.cancelText || 'Cancel';

      const iconWrap = this.overlay.querySelector<HTMLElement>('#confirm-dialog-icon-wrap');
      const iconInner = this.overlay.querySelector<HTMLElement>('#confirm-dialog-icon-inner');
      const accentBar = this.overlay.querySelector<HTMLElement>('#confirm-dialog-accent');
      const titleEl = this.overlay.querySelector<HTMLElement>('#confirm-dialog-title');
      const descEl = this.overlay.querySelector<HTMLElement>('#confirm-dialog-desc');
      const confirmBtn = this.overlay.querySelector<HTMLButtonElement>('#confirm-dialog-btn-confirm');
      const cancelBtn = this.overlay.querySelector<HTMLButtonElement>('#confirm-dialog-btn-cancel');

      if (iconWrap) {
        iconWrap.className = `confirm-dialog-icon-wrapper ${type}`;
      }
      if (accentBar) {
        accentBar.className = `confirm-dialog-accent-bar ${type}`;
      }
      if (confirmBtn) {
        confirmBtn.className = `confirm-btn confirm-btn-${type}`;
        confirmBtn.innerHTML = `<span>${escapeHtml(confirmText)}</span>`;
      }
      if (cancelBtn) {
        cancelBtn.textContent = cancelText;
      }
      if (titleEl) {
        titleEl.textContent = title;
      }

      // Format description with highlighted quotes
      if (descEl) {
        descEl.innerHTML = formatMessage(opts.message);
      }

      // Icon selection
      let defaultIcon = 'AlertTriangle';
      if (type === 'danger') defaultIcon = 'Trash2';
      else if (type === 'warning') defaultIcon = 'AlertTriangle';
      else defaultIcon = 'HelpCircle';

      const selectedIcon = opts.iconName || defaultIcon;
      if (iconInner) {
        iconInner.innerHTML = icon(selectedIcon, 26);
      }

      soundEngine.playClick();
      this.overlay.classList.remove('hidden');
      document.body.style.overflow = 'hidden';

      // Auto-focus button for quick keyboard use
      setTimeout(() => {
        if (type === 'danger') {
          cancelBtn?.focus();
        } else {
          confirmBtn?.focus();
        }
      }, 50);
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

function formatMessage(msg: string): string {
  const escaped = escapeHtml(msg);
  const formatted = escaped
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
    .replace(/&quot;(.*?)&quot;/g, '<strong class="confirm-dialog-highlight">&ldquo;$1&rdquo;</strong>');
  return formatted;
}

export const confirmDialog = new ConfirmDialogManager();
export function showConfirmDialog(options: ConfirmDialogOptions | string): Promise<boolean> {
  return confirmDialog.confirm(options);
}
