import { leaderboardEntries, liveFeedItems } from '../data/leaderboardData.ts';
import { soundEngine } from './AudioEffects.ts';
import { launchConfetti } from './Confetti.ts';
import { showToast } from './Toast.ts';
import { icon } from './Icons.ts';

export class LeaderboardSection {
  private container: HTMLElement;
  private currentPeriod: 'daily' | 'weekly' | 'alltime' = 'weekly';
  private streakClaimed: boolean = false;

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Container #${containerId} not found`);
    this.container = el;
    this.streakClaimed = localStorage.getItem('engiverse_streak_claimed') === 'true';
    this.render();
  }

  private getEntries() {
    // Generate slight variations depending on tab for realism
    if (this.currentPeriod === 'daily') {
      return [
        { ...leaderboardEntries[1], rank: 1, xp: 4250, streak: 30 },
        { ...leaderboardEntries[0], rank: 2, xp: 3890, streak: 43 },
        { ...leaderboardEntries[2], rank: 3, xp: 3620, streak: 36 },
        { ...leaderboardEntries[4], rank: 4, xp: 3100, streak: 25 },
        { ...leaderboardEntries[3], rank: 5, xp: 2950, streak: 19 }
      ];
    }
    if (this.currentPeriod === 'alltime') {
      return leaderboardEntries.map(e => ({
        ...e,
        xp: Math.round(e.xp * 4.2)
      }));
    }
    return leaderboardEntries;
  }

  private claimStreak(): void {
    if (this.streakClaimed) {
      showToast('You already claimed today’s streak bonus! Come back tomorrow.', 'info');
      return;
    }
    this.streakClaimed = true;
    localStorage.setItem('engiverse_streak_claimed', 'true');
    soundEngine.playCelebration();
    launchConfetti();
    showToast('Streak Extended to 8 Days! +250 XP Credited!', 'success');
    this.render();
  }

  public render(): void {
    const entries = this.getEntries();
    const topThree = entries.slice(0, 3);
    const rest = entries.slice(3);

    this.container.innerHTML = `
      <div class="leaderboard-wrapper">
        <!-- Control Bar -->
        <div class="leaderboard-ctrl-row">
          <div class="period-toggle">
            <button class="toggle-tab ${this.currentPeriod === 'daily' ? 'active' : ''}" data-period="daily">Daily Sprint</button>
            <button class="toggle-tab ${this.currentPeriod === 'weekly' ? 'active' : ''}" data-period="weekly">Weekly Championship</button>
            <button class="toggle-tab ${this.currentPeriod === 'alltime' ? 'active' : ''}" data-period="alltime">All-Time Pantheon</button>
          </div>

          <div class="streak-claim-box">
            <button id="btn-claim-streak" class="btn-claim-streak ${this.streakClaimed ? 'claimed' : ''}">
              <span class="fire-icon">${icon('Flame', 14)}</span>
              <span>${this.streakClaimed ? '8-Day Streak Active' : 'Claim Daily Streak (+250 XP)'}</span>
            </button>
          </div>
        </div>

        <!-- Top 3 Podium Cards -->
        <div class="podium-grid">
          <!-- Rank 2 -->
          <div class="podium-card rank-2">
            <div class="podium-badge">${icon('Medal', 13)} #2</div>
            <div class="avatar-ring ring-silver">
              <img src="${topThree[1].avatar}" alt="${topThree[1].name}" class="podium-avatar" />
            </div>
            <h4 class="podium-name">${topThree[1].name}</h4>
            <span class="podium-handle">${topThree[1].handle}</span>
            <div class="podium-specialty">${topThree[1].specialty}</div>
            <div class="podium-xp">${icon('Zap', 12)} ${topThree[1].xp.toLocaleString()} XP</div>
            <div class="podium-streak">${icon('Flame', 12)} ${topThree[1].streak}d streak</div>
          </div>

          <!-- Rank 1 (Gold, elevated) -->
          <div class="podium-card rank-1">
            <div class="crown-icon">${icon('Crown', 18)}</div>
            <div class="podium-badge">${icon('Trophy', 13)} #1 Champion</div>
            <div class="avatar-ring ring-gold">
              <img src="${topThree[0].avatar}" alt="${topThree[0].name}" class="podium-avatar" />
            </div>
            <h4 class="podium-name">${topThree[0].name}</h4>
            <span class="podium-handle">${topThree[0].handle}</span>
            <div class="podium-specialty">${topThree[0].specialty}</div>
            <div class="podium-xp gold-xp">${icon('Zap', 12)} ${topThree[0].xp.toLocaleString()} XP</div>
            <div class="podium-streak">${icon('Flame', 12)} ${topThree[0].streak}d streak</div>
          </div>

          <!-- Rank 3 -->
          <div class="podium-card rank-3">
            <div class="podium-badge">${icon('Award', 13)} #3</div>
            <div class="avatar-ring ring-bronze">
              <img src="${topThree[2].avatar}" alt="${topThree[2].name}" class="podium-avatar" />
            </div>
            <h4 class="podium-name">${topThree[2].name}</h4>
            <span class="podium-handle">${topThree[2].handle}</span>
            <div class="podium-specialty">${topThree[2].specialty}</div>
            <div class="podium-xp">${icon('Zap', 12)} ${topThree[2].xp.toLocaleString()} XP</div>
            <div class="podium-streak">${icon('Flame', 12)} ${topThree[2].streak}d streak</div>
          </div>
        </div>

        <!-- Ranks Table for 4+ -->
        <div class="leaderboard-table-card">
          <div class="table-header-row">
            <span class="col-rank">Rank</span>
            <span class="col-engineer">Engineer</span>
            <span class="col-domain">Focus Domain</span>
            <span class="col-streak">Streak</span>
            <span class="col-xp">XP</span>
          </div>

          ${rest
            .map(
              entry => `
            <div class="table-row">
              <span class="col-rank">
                <span class="rank-num">#${entry.rank}</span>
                <span class="trend-icon ${entry.trend}">${entry.trend === 'up' ? icon('TrendingUp', 13) : entry.trend === 'down' ? icon('TrendingDown', 13) : icon('Minus', 13)}</span>
              </span>
              <div class="col-engineer engineer-cell">
                <img src="${entry.avatar}" alt="${entry.name}" class="table-avatar" />
                <div class="engineer-meta">
                  <span class="eng-name">${entry.name}</span>
                  <span class="eng-handle">${entry.handle}</span>
                </div>
              </div>
              <span class="col-domain">${entry.specialty}</span>
              <span class="col-streak">${icon('Flame', 12)} ${entry.streak} days</span>
              <span class="col-xp"><strong>${entry.xp.toLocaleString()}</strong> XP</span>
            </div>
          `
            )
            .join('')}
        </div>

        <!-- Live Arena Real-time Ticker -->
        <div class="live-activity-bar">
          <div class="live-tag">
            <span class="live-blink-circle"></span>
            <span>LIVE ARENA DISPATCH</span>
          </div>
          <div class="activity-ticker">
            <div class="ticker-track">
              ${liveFeedItems
                .concat(liveFeedItems)
                .map(
                  item => `
                <div class="ticker-item">
                  <img src="${item.userAvatar}" alt="${item.userName}" class="ticker-avatar" />
                  <span class="ticker-name">${item.userName}</span>
                  <span class="ticker-action">${item.action}</span>
                  <span class="ticker-badge">${item.domainBadge}</span>
                  <span class="ticker-pts">+${item.pointsEarned} XP</span>
                  <span class="ticker-time">(${item.timestamp})</span>
                </div>
              `
                )
                .join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    // Listeners
    const periodButtons = this.container.querySelectorAll<HTMLButtonElement>('.toggle-tab');
    periodButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        soundEngine.playClick();
        this.currentPeriod = btn.getAttribute('data-period') as 'daily' | 'weekly' | 'alltime';
        this.render();
      });
    });

    const claimBtn = this.container.querySelector<HTMLButtonElement>('#btn-claim-streak');
    if (claimBtn) {
      claimBtn.addEventListener('click', () => this.claimStreak());
    }
  }
}
