import { renderLandingView } from './views/LandingView.ts';
import { renderRegisterView } from './views/RegisterView.ts';
import { renderLoginView } from './views/LoginView.ts';
import { renderAdminLoginView } from './views/AdminLoginView.ts';
import { renderAdminDashboardView } from './views/AdminDashboardView.ts';
import { renderParticipantPortalView } from './views/ParticipantPortalView.ts';
import { renderDailyQuizView } from './views/DailyQuizView.ts';
import { renderEventsListView } from './views/EventsListView.ts';
import { renderLiveEventQuizView } from './views/LiveEventQuizView.ts';

export type AppView =
  | 'landing'
  | 'register'
  | 'login'
  | 'admin-login'
  | 'admin-dashboard'
  | 'portal'
  | 'daily-quiz'
  | 'events'
  | 'live-event';

export class AppRouter {
  private root: HTMLElement;
  private currentView: AppView = 'landing';
  private currentParams: any = null;

  constructor(rootId: string = 'app') {
    const rootEl = document.getElementById(rootId);
    if (!rootEl) {
      throw new Error(`Root #${rootId} element not found in DOM`);
    }
    this.root = rootEl;
    this.init();
  }

  private init(): void {
    // Listen for hash changes
    window.addEventListener('hashchange', () => {
      this.handleHashChange();
    });

    // Check initial hash route
    this.handleHashChange();
  }

  public navigateTo(view: AppView | string, params?: any): void {
    this.currentView = view as AppView;
    this.currentParams = params || null;

    if (view === 'register') {
      window.location.hash = '#register';
    } else if (view === 'login') {
      window.location.hash = '#login';
    } else if (view === 'admin-login') {
      window.location.hash = '#admin-login';
    } else if (view === 'admin-dashboard') {
      window.location.hash = '#admin';
    } else if (view === 'portal') {
      window.location.hash = '#portal';
    } else if (view === 'daily-quiz') {
      window.location.hash = '#daily-quiz';
    } else if (view === 'events') {
      window.location.hash = '#events';
    } else if (view === 'live-event') {
      window.location.hash = params?.eventId ? `#live-event/${params.eventId}` : '#live-event';
    } else {
      window.location.hash = '';
    }
    this.render();
  }

  private handleHashChange(): void {
    const hash = window.location.hash.toLowerCase();

    if (hash === '#register') {
      this.currentView = 'register';
    } else if (hash === '#login') {
      this.currentView = 'login';
    } else if (hash === '#admin-login') {
      this.currentView = 'admin-login';
    } else if (hash === '#admin' || hash === '#admin-dashboard') {
      this.currentView = 'admin-dashboard';
    } else if (hash === '#portal' || hash === '#dashboard') {
      this.currentView = 'portal';
    } else if (hash === '#daily-quiz') {
      this.currentView = 'daily-quiz';
    } else if (hash === '#events') {
      this.currentView = 'events';
    } else if (hash.startsWith('#live-event')) {
      this.currentView = 'live-event';
      const parts = hash.split('/');
      if (parts[1]) {
        this.currentParams = { eventId: parts[1] };
      }
    } else {
      this.currentView = 'landing';
    }
    this.render();
  }

  private render(): void {
    window.scrollTo({ top: 0, behavior: 'instant' });
    this.root.innerHTML = '';

    const nav = (nextView: string, params?: any) => this.navigateTo(nextView as AppView, params);

    if (this.currentView === 'landing') {
      renderLandingView(this.root, nav);
    } else if (this.currentView === 'register') {
      renderRegisterView(this.root, nav);
    } else if (this.currentView === 'login') {
      renderLoginView(this.root, nav);
    } else if (this.currentView === 'admin-login') {
      renderAdminLoginView(this.root, nav);
    } else if (this.currentView === 'admin-dashboard') {
      renderAdminDashboardView(this.root, nav);
    } else if (this.currentView === 'portal') {
      renderParticipantPortalView(this.root, nav);
    } else if (this.currentView === 'daily-quiz') {
      renderDailyQuizView(this.root, nav);
    } else if (this.currentView === 'events') {
      renderEventsListView(this.root, nav);
    } else if (this.currentView === 'live-event') {
      const eventId = this.currentParams?.eventId;
      if (!eventId) {
        this.navigateTo('events');
        return;
      }
      renderLiveEventQuizView(this.root, { eventId, viewLeaderboardOnly: this.currentParams?.viewLeaderboardOnly }, nav);
    }
  }
}
