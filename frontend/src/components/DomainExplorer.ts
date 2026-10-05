import { domainCategories } from '../data/domainsData.ts';
import { DomainCategory } from '../types/index.ts';
import { modalManager } from './Modal.ts';
import { soundEngine } from './AudioEffects.ts';
import { icon } from './Icons.ts';
import { apiGetDomains } from '../api/client.ts';

export class DomainExplorer {
  private container: HTMLElement;
  private currentFilter: string = 'all';
  private domains: DomainCategory[] = domainCategories;

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Container #${containerId} not found`);
    this.container = el;
    this.render();

    apiGetDomains()
      .then(res => {
        if (res && res.success && Array.isArray(res.domains) && res.domains.length > 0) {
          // Merge dynamic counts with dynamic sample questions
          this.domains = res.domains.map((d: any) => {
            const fallback = domainCategories.find(dc => dc.id === d.id);
            return {
              ...fallback,
              ...d,
              sampleQuestion: d.sampleQuestion || undefined
            };
          });
          this.render();
        }
      })
      .catch(err => console.warn('Dynamic domains fetch error:', err));
  }

  private filterDomains(category: string): DomainCategory[] {
    if (category === 'all') return this.domains;
    if (category === 'software') {
      return this.domains.filter(d => ['computer-science', 'cloud-devops'].includes(d.id));
    }
    if (category === 'ai') {
      return this.domains.filter(d => d.id === 'ai-machine-learning');
    }
    if (category === 'hardware') {
      return this.domains.filter(d => ['electrical-embedded', 'robotics-mechatronics'].includes(d.id));
    }
    if (category === 'frontier') {
      return this.domains.filter(d => ['quantum-computing'].includes(d.id));
    }
    return this.domains;
  }

  public render(): void {
    const filtered = this.filterDomains(this.currentFilter);

    this.container.innerHTML = `
      <div class="domain-filter-bar">
        <button class="filter-chip ${this.currentFilter === 'all' ? 'active' : ''}" data-filter="all">
          ${icon('Globe', 14)} All Universes (${domainCategories.length})
        </button>
        <button class="filter-chip ${this.currentFilter === 'software' ? 'active' : ''}" data-filter="software">
          ${icon('Laptop', 14)} Systems & Cloud
        </button>
        <button class="filter-chip ${this.currentFilter === 'ai' ? 'active' : ''}" data-filter="ai">
          ${icon('Brain', 14)} AI & Deep Learning
        </button>
        <button class="filter-chip ${this.currentFilter === 'hardware' ? 'active' : ''}" data-filter="hardware">
          ${icon('Zap', 14)} VLSI & Robotics
        </button>
        <button class="filter-chip ${this.currentFilter === 'frontier' ? 'active' : ''}" data-filter="frontier">
          ${icon('Atom', 14)} Quantum Frontier
        </button>
      </div>

      <div class="domains-grid">
        ${filtered
          .map(
            domain => `
          <div class="domain-card" data-domain-id="${domain.id}">
            <div class="domain-card-glow" style="background: radial-gradient(circle at top right, ${domain.accentColor}18, transparent 70%);"></div>
            
            <div class="domain-header">
              <div class="domain-icon-box" style="box-shadow: 0 4px 12px ${domain.accentColor}25; color: ${domain.accentColor};">
                ${icon(domain.icon, 24)}
              </div>
              <div class="domain-badges">
                <span class="badge-pill" style="color: ${domain.accentColor}; background: ${domain.accentColor}12; border: 1px solid ${domain.accentColor}30;">
                  ${domain.badge}
                </span>
                <span class="difficulty-tag ${domain.difficulty.toLowerCase()}">
                  ${domain.difficulty}
                </span>
              </div>
            </div>

            <h3 class="domain-title">${domain.name}</h3>
            <p class="domain-desc">${domain.description}</p>

            <div class="domain-stats-row">
              <div class="stat-item">
                <span class="stat-num">${domain.questionCount}+</span>
                <span class="stat-lbl">Questions</span>
              </div>
              <div class="stat-item">
                <span class="stat-num">${domain.activeLearners}</span>
                <span class="stat-lbl">Learners</span>
              </div>
              <div class="stat-item">
                <span class="stat-num">98.4%</span>
                <span class="stat-lbl">Verified</span>
              </div>
            </div>

            <div class="domain-topics-wrapper">
              <span class="topics-heading">Featured Concepts:</span>
              <div class="topics-pills">
                ${domain.popularTopics
                  .map(topic => `<span class="topic-pill">${topic}</span>`)
                  .join('')}
              </div>
            </div>

            <div class="domain-card-actions">
              <button class="btn-card-preview" data-preview-id="${domain.id}">
                <span>Inspect Challenge</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </button>
              <a href="#hero-quiz-container" class="btn-card-launch" style="background-color: ${domain.accentColor};">
                <span>Start Domain</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </a>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    `;

    // Attach filter listeners
    const chips = this.container.querySelectorAll<HTMLButtonElement>('.filter-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        soundEngine.playClick();
        this.currentFilter = chip.getAttribute('data-filter') || 'all';
        this.render();
      });
    });

    // Attach inspect sample preview modal listeners
    const previewButtons = this.container.querySelectorAll<HTMLButtonElement>('.btn-card-preview');
    previewButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const domainId = btn.getAttribute('data-preview-id');
        const domain = this.domains.find(d => d.id === domainId);
        if (domain) {
          if (domain.sampleQuestion) {
            modalManager.openDomainPreview(domain.sampleQuestion, domain.name);
          } else {
            modalManager.openEmptyPreview(domain.name);
          }
        }
      });
    });
  }
}
