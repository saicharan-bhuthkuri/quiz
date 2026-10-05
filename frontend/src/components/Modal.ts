import { QuizQuestion } from '../types/index.ts';
import { soundEngine } from './AudioEffects.ts';
import { icon } from './Icons.ts';

export class ModalManager {
  private modalOverlay: HTMLElement | null = null;

  constructor() {
    this.createModalStructure();
  }

  private createModalStructure(): void {
    if (document.getElementById('engiverse-modal-overlay')) return;

    this.modalOverlay = document.createElement('div');
    this.modalOverlay.id = 'engiverse-modal-overlay';
    this.modalOverlay.className = 'modal-backdrop hidden';
    this.modalOverlay.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <div class="modal-header-titles">
            <span id="modal-eyebrow" class="modal-eyebrow">Sample Challenge</span>
            <h3 id="modal-title" class="modal-title">Domain Challenge Preview</h3>
          </div>
          <button id="modal-close-btn" class="modal-close-button" aria-label="Close modal">${icon('X', 18)}</button>
        </div>
        <div id="modal-content" class="modal-body"></div>
        <div class="modal-footer">
          <button id="modal-dismiss-btn" class="btn-secondary">Close Preview</button>
          <a href="#hero-quiz-container" id="modal-action-btn" class="btn-primary">Take Full Quiz Now ${icon('Zap', 14)}</a>
        </div>
      </div>
    `;

    document.body.appendChild(this.modalOverlay);

    // Close handlers
    const closeBtn = this.modalOverlay.querySelector('#modal-close-btn');
    const dismissBtn = this.modalOverlay.querySelector('#modal-dismiss-btn');
    const actionBtn = this.modalOverlay.querySelector('#modal-action-btn');

    closeBtn?.addEventListener('click', () => this.close());
    dismissBtn?.addEventListener('click', () => this.close());
    actionBtn?.addEventListener('click', () => this.close());

    this.modalOverlay.addEventListener('click', (e) => {
      if (e.target === this.modalOverlay) {
        this.close();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.modalOverlay?.classList.contains('hidden')) {
        this.close();
      }
    });
  }

  public openDomainPreview(question: QuizQuestion, domainName: string): void {
    soundEngine.playClick();
    if (!this.modalOverlay) this.createModalStructure();
    if (!this.modalOverlay) return;

    const eyebrow = this.modalOverlay.querySelector('#modal-eyebrow');
    const title = this.modalOverlay.querySelector('#modal-title');
    const content = this.modalOverlay.querySelector('#modal-content');

    if (eyebrow) eyebrow.textContent = `${domainName} • ${question.difficulty} Level`;
    if (title) title.textContent = `Featured Engineering Challenge`;

    if (content) {
      content.innerHTML = `
        <div class="modal-challenge-card">
          <div class="challenge-meta">
            <span class="difficulty-tag ${question.difficulty.toLowerCase()}">${question.difficulty}</span>
            <span class="xp-badge">${icon('Zap', 13)} ${question.xpReward} XP</span>
          </div>

          <h4 class="challenge-q-text">${question.question}</h4>

          ${
            question.codeSnippet
              ? `<pre class="code-snippet-block"><code>${escapeHtml(question.codeSnippet)}</code></pre>`
              : ''
          }

          <div class="modal-options-list">
            ${question.options
              .map(
                (opt, idx) => `
                <div class="modal-option-item ${idx === question.correctIndex ? 'correct-hint' : ''}">
                  <span class="option-letter">${String.fromCharCode(65 + idx)}</span>
                  <span class="option-text">${escapeHtml(opt)}</span>
                  ${idx === question.correctIndex ? `<span class="verified-check">${icon('Check', 12)} Answer</span>` : ''}
                </div>
              `
              )
              .join('')}
          </div>

          <div class="modal-explanation">
            <div class="exp-title">${icon('Lightbulb', 14)} Deep Dive Concept:</div>
            <p class="exp-body">${question.explanation}</p>
          </div>
        </div>
      `;
    }

    this.modalOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  public openEmptyPreview(domainName: string): void {
    soundEngine.playClick();
    if (!this.modalOverlay) this.createModalStructure();
    if (!this.modalOverlay) return;

    const eyebrow = this.modalOverlay.querySelector('#modal-eyebrow');
    const title = this.modalOverlay.querySelector('#modal-title');
    const content = this.modalOverlay.querySelector('#modal-content');

    if (eyebrow) eyebrow.textContent = `${domainName} • Domain Challenge`;
    if (title) title.textContent = `Featured Engineering Challenge`;

    if (content) {
      content.innerHTML = `
        <div class="modal-challenge-card" style="text-align: center; padding: 2.5rem 1.5rem;">
          <div style="font-size: 2.2rem; margin-bottom: 0.75rem;">💡</div>
          <h4 class="challenge-q-text" style="font-size: 1.1rem; margin-bottom: 0.5rem;">Dynamic Question Repository</h4>
          <p style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.5;">
            Questions are loaded dynamically from the live database. Create and manage event questions in the Admin Console to preview domain-specific challenges.
          </p>
        </div>
      `;
    }

    this.modalOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  public close(): void {
    if (!this.modalOverlay) return;
    this.modalOverlay.classList.add('hidden');
    document.body.style.overflow = '';
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

export const modalManager = new ModalManager();
