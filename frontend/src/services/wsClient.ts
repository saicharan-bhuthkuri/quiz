// WebSocket Real-Time Client for Engiverse Live Quiz Platform

export interface WsMessage<T = any> {
  type: string;
  payload?: T;
  timestamp?: string;
}

type MessageHandler<T = any> = (payload: T) => void;

class RealtimeWebSocketClient {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<MessageHandler>>();
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private isExplicitlyClosed = false;
  private currentUser: { id: string; name: string; email: string; role?: string } | null = null;
  private currentEventId: string | null = null;
  private statusListeners = new Set<(connected: boolean) => void>();

  constructor() {
    this.initCurrentUser();
  }

  private initCurrentUser() {
    try {
      const adminToken = sessionStorage.getItem('engiverse_admin_token');
      const adminEmail = sessionStorage.getItem('engiverse_admin_email');
      const adminName = sessionStorage.getItem('engiverse_admin_name');
      const adminRole = sessionStorage.getItem('engiverse_admin_role');

      if (adminToken && (adminRole === 'ADMIN' || adminRole === 'SUPERADMIN')) {
        this.currentUser = {
          id: 'admin_' + (adminEmail || 'root'),
          name: adminName || 'Platform Administrator',
          email: adminEmail || 'admin@engiverse.io',
          role: adminRole
        };
        return;
      }

      const raw = localStorage.getItem('engiverse_user');
      if (raw) {
        const u = JSON.parse(raw);
        this.currentUser = {
          id: u.id,
          name: u.name,
          email: u.email,
          role: 'PARTICIPANT'
        };
      }
    } catch {
      this.currentUser = null;
    }
  }

  public connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isExplicitlyClosed = false;
    this.initCurrentUser();

    const envWsUrl = (import.meta as unknown as { env?: { VITE_WS_URL?: string } }).env?.VITE_WS_URL;
    let wsUrl = envWsUrl;

    if (!wsUrl) {
      const envApiUrl = (import.meta as unknown as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL;
      if (envApiUrl && !envApiUrl.includes('localhost')) {
        try {
          const parsed = new URL(envApiUrl);
          const wsProtocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
          wsUrl = `${wsProtocol}//${parsed.host}/ws`;
        } catch {
          // fallback to default
        }
      }
    }

    if (!wsUrl) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // Connect to port 5000 in dev or same host
      const host = window.location.hostname === 'localhost' ? 'localhost:5000' : window.location.host;
      wsUrl = `${protocol}//${host}/ws`;
    }

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.notifyStatus(true);
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }

        const adminToken = sessionStorage.getItem('engiverse_admin_token') || undefined;

        // Identify client
        if (this.currentUser) {
          this.send('IDENTIFY', {
            userId: this.currentUser.id,
            userName: this.currentUser.name,
            role: this.currentUser.role || 'PARTICIPANT',
            adminToken
          });
        }

        // If client was previously in a room, re-join it immediately (seamless reconnect!)
        if (this.currentEventId) {
          this.send('JOIN_EVENT_ROOM', {
            eventId: this.currentEventId,
            userId: this.currentUser?.id,
            userName: this.currentUser?.name,
            role: this.currentUser?.role,
            adminToken
          });
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const msg: WsMessage = JSON.parse(event.data);
          this.dispatch(msg.type, msg.payload);
        } catch (err) {
          console.error('[WS Client] Failed to parse incoming message:', err);
        }
      };

      this.ws.onclose = () => {
        this.notifyStatus(false);
        this.ws = null;
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[WS Client Error]:', err);
        this.ws?.close();
      };
    } catch (err) {
      console.error('[WS Client Connect Exception]:', err);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout || this.isExplicitlyClosed) return;
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, 2000);
  }

  public disconnect(): void {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public setUser(user: { id: string; name: string; email: string; role?: string }) {
    this.currentUser = user;
    if (this.isConnected()) {
      this.send('IDENTIFY', {
        userId: user.id,
        userName: user.name,
        role: user.role || 'PARTICIPANT'
      });
    }
  }

  public send(type: string, payload?: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // Connect if not already connecting
      this.connect();
      // Retry once connected
      setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type, payload, timestamp: new Date().toISOString() }));
        }
      }, 500);
      return;
    }

    this.ws.send(JSON.stringify({ type, payload, timestamp: new Date().toISOString() }));
  }

  // Subscribe to typed WebSocket events
  public on<T = any>(type: string, handler: MessageHandler<T>): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);

    // Return unbind function
    return () => {
      this.handlers.get(type)?.delete(handler);
    };
  }

  private dispatch(type: string, payload: any): void {
    const list = this.handlers.get(type);
    if (list) {
      list.forEach((cb) => {
        try {
          cb(payload);
        } catch (err) {
          console.error(`[WS Handler Error for ${type}]:`, err);
        }
      });
    }
  }

  public refreshUser(): void {
    this.initCurrentUser();
    if (this.currentUser && this.isConnected()) {
      this.send('IDENTIFY', {
        userId: this.currentUser.id,
        userName: this.currentUser.name,
        role: this.currentUser.role || 'PARTICIPANT'
      });
    }
  }

  // Room Management
  public joinEventRoom(eventId: string): void {
    this.currentEventId = eventId;
    this.initCurrentUser();
    if (this.currentUser) {
      this.send('IDENTIFY', {
        userId: this.currentUser.id,
        userName: this.currentUser.name,
        role: this.currentUser.role || 'PARTICIPANT'
      });
    }
    this.send('JOIN_EVENT_ROOM', {
      eventId,
      userId: this.currentUser?.id,
      userName: this.currentUser?.name,
      role: this.currentUser?.role || 'PARTICIPANT'
    });
  }

  public leaveEventRoom(eventId?: string): void {
    const target = eventId || this.currentEventId;
    if (target) {
      this.send('LEAVE_EVENT_ROOM', { eventId: target });
      if (this.currentEventId === target) {
        this.currentEventId = null;
      }
    }
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  public onConnectionChange(listener: (connected: boolean) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.isConnected());
    return () => this.statusListeners.delete(listener);
  }

  private notifyStatus(connected: boolean) {
    this.statusListeners.forEach((fn) => fn(connected));
  }
}

export const wsClient = new RealtimeWebSocketClient();
