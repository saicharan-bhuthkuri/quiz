import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';
import { db } from './db.js';

export interface EventQuestionData {
  id: string;
  eventId: string;
  questionText: string;
  options: string[];
  correctOption: number;
  explanation: string;
  points: number;
  timerSeconds: number;
  questionOrder: number;
}

export interface LiveEventState {
  id: string;
  title: string;
  description: string;
  domain: string;
  status: 'UPCOMING' | 'LOBBY' | 'EVENT_STARTED_WAITING_QUESTION' | 'QUESTION_ACTIVE' | 'QUESTION_ENDED' | 'EVENT_ENDED';
  currentQuestionIndex: number;
  questionStartTime: number | null;
  questionRemainingSeconds: number;
  timerInterval: NodeJS.Timeout | null;
  isPaused?: boolean;
  questions: EventQuestionData[];
  registeredUsers: Set<string>;
  scores: Map<string, {
    userId: string;
    userName: string;
    score: number;
    correctCount: number;
    totalTimeSeconds: number;
    answers: Map<string, { selectedOption: number; isCorrect: boolean; timeTaken: number; points: number }>;
  }>;
}

interface ClientConnection {
  ws: WebSocket;
  userId?: string;
  userName?: string;
  role?: string;
  currentEventId?: string;
}

class RealtimeQuizEngine {
  private wss: WebSocketServer | null = null;
  private clients = new Map<WebSocket, ClientConnection>();
  private activeEvents = new Map<string, LiveEventState>();

  public init(server: HttpServer) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      const client: ClientConnection = { ws };
      this.clients.set(ws, client);

      ws.on('message', async (raw: string) => {
        try {
          const msg = JSON.parse(raw.toString());
          await this.handleClientMessage(client, msg);
        } catch (err) {
          console.error('[WS] Error processing message:', err);
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
      });

      ws.on('error', (err) => {
        console.error('[WS Client Error]', err);
        this.clients.delete(ws);
      });

      // Send initial connection ACK
      this.sendToClient(client, {
        type: 'CONNECTED',
        timestamp: new Date().toISOString()
      });
    });

    console.log('[Realtime Engine] WebSocket Server listening at /ws');
  }

  // Load or get live state for an event
  public async getOrLoadEventState(eventId: string): Promise<LiveEventState | null> {
    if (this.activeEvents.has(eventId)) {
      return this.activeEvents.get(eventId)!;
    }

    try {
      const eventRes = await db.execute({
        sql: 'SELECT * FROM events WHERE id = ? LIMIT 1;',
        args: [eventId]
      });

      if (eventRes.rows.length === 0) return null;
      const evRow = eventRes.rows[0];

      // Load questions
      const qRes = await db.execute({
        sql: 'SELECT * FROM event_questions WHERE event_id = ? ORDER BY question_order ASC;',
        args: [eventId]
      });

      const questions: EventQuestionData[] = qRes.rows.map(row => {
        let opts: string[] = [];
        try {
          opts = JSON.parse(String(row.options_json || '[]'));
        } catch {
          opts = [];
        }
        return {
          id: String(row.id),
          eventId: String(row.event_id),
          questionText: String(row.question_text),
          options: opts,
          correctOption: Number(row.correct_option || 0),
          explanation: String(row.explanation || ''),
          points: Number(row.points || 100),
          timerSeconds: Number(row.timer_seconds || 30),
          questionOrder: Number(row.question_order || 1)
        };
      });

      // Load registrations
      const regRes = await db.execute({
        sql: 'SELECT user_id, user_name FROM event_registrations WHERE event_id = ?;',
        args: [eventId]
      });

      const registeredUsers = new Set<string>();
      const scores = new Map<string, {
        userId: string;
        userName: string;
        score: number;
        correctCount: number;
        totalTimeSeconds: number;
        answers: Map<string, { selectedOption: number; isCorrect: boolean; timeTaken: number; points: number }>;
      }>();

      for (const r of regRes.rows) {
        const uId = String(r.user_id);
        const uName = String(r.user_name);
        registeredUsers.add(uId);
        scores.set(uId, {
          userId: uId,
          userName: uName,
          score: 0,
          correctCount: 0,
          totalTimeSeconds: 0,
          answers: new Map()
        });
      }

      // Load previous answers if event was in progress
      const ansRes = await db.execute({
        sql: 'SELECT * FROM event_answers WHERE event_id = ?;',
        args: [eventId]
      });

      for (const a of ansRes.rows) {
        const uId = String(a.user_id);
        const qId = String(a.question_id);
        const isCorrect = Number(a.is_correct) === 1;
        const pts = Number(a.points_earned || 0);
        const timeSec = Number(a.time_taken_seconds || 0);

        let userScore = scores.get(uId);
        if (!userScore) {
          userScore = {
            userId: uId,
            userName: String(a.user_name || 'Participant'),
            score: 0,
            correctCount: 0,
            totalTimeSeconds: 0,
            answers: new Map()
          };
          scores.set(uId, userScore);
        }

        userScore.answers.set(qId, {
          selectedOption: Number(a.selected_option),
          isCorrect,
          timeTaken: timeSec,
          points: pts
        });

        if (isCorrect) {
          userScore.score += pts;
          userScore.correctCount += 1;
        }
        userScore.totalTimeSeconds += timeSec;
      }

      const rawStatus = String(evRow.status || 'UPCOMING');
      let status: LiveEventState['status'] = 'UPCOMING';
      if (rawStatus === 'LIVE_NOW') status = 'LOBBY';
      else if (rawStatus === 'COMPLETED') status = 'EVENT_ENDED';

      const state: LiveEventState = {
        id: String(evRow.id),
        title: String(evRow.title),
        description: String(evRow.description || ''),
        domain: String(evRow.domain || 'Engineering'),
        status,
        currentQuestionIndex: Number(evRow.current_question_index ?? -1),
        questionStartTime: null,
        questionRemainingSeconds: Number(evRow.timer_seconds || 30),
        timerInterval: null,
        questions,
        registeredUsers,
        scores
      };

      this.activeEvents.set(eventId, state);
      return state;
    } catch (err) {
      console.error('[Realtime Engine] Failed to load event state from DB:', err);
      return null;
    }
  }

  // Handle incoming WebSocket messages
  private async handleClientMessage(client: ClientConnection, msg: any) {
    const { type, payload } = msg;

    switch (type) {
      case 'IDENTIFY': {
        client.userId = payload?.userId;
        client.userName = payload?.userName;
        client.role = payload?.role || 'PARTICIPANT';
        break;
      }

      case 'JOIN_EVENT_ROOM': {
        const { eventId, userId, userName } = payload || {};
        if (!eventId) return;

        client.currentEventId = eventId;
        if (userId) client.userId = userId;
        if (userName) client.userName = userName;

        const state = await this.getOrLoadEventState(eventId);
        if (!state) return;

        // If user is registered or admin, add to room
        if (client.userId && !state.scores.has(client.userId)) {
          state.scores.set(client.userId, {
            userId: client.userId,
            userName: client.userName || 'Participant',
            score: 0,
            correctCount: 0,
            totalTimeSeconds: 0,
            answers: new Map()
          });
        }

        // Send full state snapshot to client for seamless connection / reconnection without refresh!
        this.sendEventSnapshot(client, state);
        break;
      }

      case 'LEAVE_EVENT_ROOM': {
        client.currentEventId = undefined;
        break;
      }

      case 'REGISTER_FOR_EVENT': {
        const { eventId, user } = payload || {};
        if (!eventId || !user?.id) return;

        try {
          const regId = 'reg_' + Math.random().toString(36).substring(2, 10);
          await db.execute({
            sql: `INSERT OR IGNORE INTO event_registrations (id, event_id, user_id, user_name, user_email, registered_at)
                  VALUES (?, ?, ?, ?, ?, datetime('now'));`,
            args: [regId, eventId, user.id, user.name, user.email]
          });

          const state = await this.getOrLoadEventState(eventId);
          if (state) {
            state.registeredUsers.add(user.id);
            if (!state.scores.has(user.id)) {
              state.scores.set(user.id, {
                userId: user.id,
                userName: user.name,
                score: 0,
                correctCount: 0,
                totalTimeSeconds: 0,
                answers: new Map()
              });
            }
          }

          // Broadcast registration update to all connected clients immediately!
          this.broadcastAll({
            type: 'EVENT_REGISTERED',
            payload: {
              eventId,
              userId: user.id,
              userName: user.name,
              totalRegistered: state ? state.registeredUsers.size : 1
            }
          });
        } catch (err) {
          console.error('[Realtime Engine] Registration error:', err);
        }
        break;
      }

      case 'SUBMIT_ANSWER': {
        const { eventId, questionId, selectedOption, timeTakenSeconds } = payload || {};
        if (!eventId || !questionId || selectedOption === undefined || !client.userId) return;

        const state = await this.getOrLoadEventState(eventId);
        if (!state) return;

        const currentQ = state.questions[state.currentQuestionIndex];
        if (!currentQ || currentQ.id !== questionId) return;

        // Check if user already answered this question
        const userScore = state.scores.get(client.userId);
        if (userScore?.answers.has(questionId)) {
          return; // Already submitted
        }

        const isCorrect = selectedOption === currentQ.correctOption;
        // Speed bonus: full points if answered quickly, scale with remaining time
        const duration = currentQ.timerSeconds || 30;
        const timeTaken = Math.min(duration, Math.max(0.5, Number(timeTakenSeconds || 1)));
        const speedMultiplier = Math.max(0.6, (duration - timeTaken * 0.5) / duration);
        const pointsEarned = isCorrect ? Math.round(currentQ.points * speedMultiplier) : 0;

        // Save to DB
        const ansId = 'ans_' + Math.random().toString(36).substring(2, 10);
        try {
          await db.execute({
            sql: `INSERT OR REPLACE INTO event_answers (id, event_id, question_id, user_id, user_name, selected_option, is_correct, points_earned, time_taken_seconds, submitted_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'));`,
            args: [
              ansId,
              eventId,
              questionId,
              client.userId,
              client.userName || 'Participant',
              selectedOption,
              isCorrect ? 1 : 0,
              pointsEarned,
              timeTaken
            ]
          });
        } catch (dbErr) {
          console.error('[DB Insert Answer Error]:', dbErr);
        }

        if (userScore) {
          userScore.answers.set(questionId, {
            selectedOption,
            isCorrect,
            timeTaken,
            points: pointsEarned
          });
          if (isCorrect) {
            userScore.score += pointsEarned;
            userScore.correctCount += 1;
          }
          userScore.totalTimeSeconds += timeTaken;
        }

        // Send status-only confirmation back to participant (NO score, NO isCorrect, NO points)
        this.sendToClient(client, {
          type: 'ANSWER_SUBMITTED',
          payload: {
            questionId,
            selectedOption,
            status: 'RECORDED'
          }
        });

        // Broadcast live score update & live leaderboard EXCLUSIVELY to Admin Dashboard
        this.broadcastToAdmins(eventId, {
          type: 'ADMIN_SCORE_UPDATED',
          payload: {
            eventId,
            userId: client.userId,
            userName: client.userName || 'Participant',
            questionId,
            selectedOption,
            isCorrect,
            pointsEarned,
            score: userScore?.score || 0,
            correctCount: userScore?.correctCount || 0,
            leaderboard: this.getLeaderboard(state)
          }
        });

        // Broadcast anonymized answer submission counter to room for Admin counter update
        this.broadcastToRoom(eventId, {
          type: 'ANSWER_SUBMITTED',
          payload: {
            eventId,
            questionId
          }
        });
        break;
      }

      // =========================================================================
      // ADMIN COMMANDS (Server controls question flow & event state)
      // =========================================================================

      case 'ADMIN_START_EVENT': {
        const { eventId } = payload || {};
        if (!eventId) return;

        const state = await this.getOrLoadEventState(eventId);
        if (!state) return;

        state.status = 'EVENT_STARTED_WAITING_QUESTION';
        state.currentQuestionIndex = -1;

        await db.execute({
          sql: "UPDATE events SET status = 'LIVE_NOW', current_question_index = -1 WHERE id = ?;",
          args: [eventId]
        });

        // Broadcast to all clients in app that event has started (waiting for next question)
        this.broadcastAll({
          type: 'EVENT_STARTED',
          payload: {
            eventId,
            status: 'EVENT_STARTED_WAITING_QUESTION',
            title: state.title
          }
        });

        // Broadcast state snapshot to the event room (participants see Event Started — Waiting for Next Question)
        this.broadcastEventSnapshot(state);
        break;
      }

      case 'ADMIN_SEND_QUESTION': {
        const { eventId, questionIndex } = payload || {};
        if (!eventId) return;

        const state = await this.getOrLoadEventState(eventId);
        if (!state) return;

        const qIdx = questionIndex !== undefined ? questionIndex : state.currentQuestionIndex + 1;
        if (qIdx < 0 || qIdx >= state.questions.length) return;

        // Clear existing interval
        if (state.timerInterval) {
          clearInterval(state.timerInterval);
          state.timerInterval = null;
        }

        state.status = 'QUESTION_ACTIVE';
        state.currentQuestionIndex = qIdx;
        const currentQ = state.questions[qIdx];
        state.questionRemainingSeconds = currentQ.timerSeconds || 30;
        state.questionStartTime = Date.now();

        await db.execute({
          sql: 'UPDATE events SET status = ?, current_question_index = ? WHERE id = ?;',
          args: ['LIVE_NOW', qIdx, eventId]
        });

        // Broadcast QUESTION_SENT to all participants simultaneously
        this.broadcastToRoom(eventId, {
          type: 'QUESTION_SENT',
          payload: {
            eventId,
            questionIndex: qIdx,
            totalQuestions: state.questions.length,
            question: {
              id: currentQ.id,
              questionText: currentQ.questionText,
              options: currentQ.options,
              points: currentQ.points,
              timerSeconds: currentQ.timerSeconds,
              questionOrder: currentQ.questionOrder
            }
          }
        });

        // Start server-side synchronized timer
        state.timerInterval = setInterval(() => {
          state.questionRemainingSeconds -= 1;

          this.broadcastToRoom(eventId, {
            type: 'QUESTION_TIMER_STARTED',
            payload: {
              eventId,
              questionIndex: qIdx,
              remainingSeconds: Math.max(0, state.questionRemainingSeconds),
              totalSeconds: currentQ.timerSeconds
            }
          });

          if (state.questionRemainingSeconds <= 0) {
            if (state.timerInterval) {
              clearInterval(state.timerInterval);
              state.timerInterval = null;
            }
            this.handleQuestionTimeExpired(state);
          }
        }, 1000);

        break;
      }

      case 'ADMIN_NEXT_QUESTION': {
        const { eventId } = payload || {};
        if (!eventId) return;

        const state = await this.getOrLoadEventState(eventId);
        if (!state) return;

        const nextIdx = state.currentQuestionIndex + 1;
        if (nextIdx < state.questions.length) {
          // Send next question automatically
          await this.handleClientMessage(client, {
            type: 'ADMIN_SEND_QUESTION',
            payload: { eventId, questionIndex: nextIdx }
          });
        } else {
          // Conclude event
          await this.handleClientMessage(client, {
            type: 'ADMIN_END_EVENT',
            payload: { eventId }
          });
        }
        break;
      }

      case 'ADMIN_END_EVENT': {
        const { eventId } = payload || {};
        if (!eventId) return;

        const state = await this.getOrLoadEventState(eventId);
        if (!state) return;

        if (state.timerInterval) {
          clearInterval(state.timerInterval);
          state.timerInterval = null;
        }

        state.status = 'EVENT_ENDED';

        await db.execute({
          sql: "UPDATE events SET status = 'COMPLETED' WHERE id = ?;",
          args: [eventId]
        });

        const finalLeaderboard = this.getLeaderboard(state);

        // Notify participants: Event Completed (NO score or rankings shown to participants)
        this.broadcastToRoom(eventId, {
          type: 'EVENT_ENDED',
          payload: {
            eventId,
            status: 'EVENT_ENDED'
          }
        });

        // Send full official results exclusively to Admin
        this.broadcastToAdmins(eventId, {
          type: 'ADMIN_EVENT_CONCLUDED',
          payload: {
            eventId,
            leaderboard: finalLeaderboard
          }
        });

        this.broadcastAll({
          type: 'EVENT_COMPLETED',
          payload: {
            eventId,
            status: 'COMPLETED'
          }
        });

        break;
      }

      case 'ADMIN_PAUSE_TIMER': {
        const { eventId } = payload || {};
        if (!eventId) return;

        const state = await this.getOrLoadEventState(eventId);
        if (!state) return;

        if (state.timerInterval) {
          clearInterval(state.timerInterval);
          state.timerInterval = null;
        }
        state.isPaused = true;

        this.broadcastToRoom(eventId, {
          type: 'EVENT_PAUSED',
          payload: {
            eventId,
            remainingSeconds: state.questionRemainingSeconds
          }
        });
        break;
      }

      case 'ADMIN_RESUME_TIMER': {
        const { eventId } = payload || {};
        if (!eventId) return;

        const state = await this.getOrLoadEventState(eventId);
        if (!state || state.status !== 'QUESTION_ACTIVE' || state.timerInterval) return;

        state.isPaused = false;
        const currentQ = state.questions[state.currentQuestionIndex];
        const totalSec = currentQ ? (currentQ.timerSeconds || 30) : 30;

        this.broadcastToRoom(eventId, {
          type: 'EVENT_RESUMED',
          payload: {
            eventId,
            remainingSeconds: state.questionRemainingSeconds
          }
        });

        state.timerInterval = setInterval(() => {
          state.questionRemainingSeconds -= 1;

          this.broadcastToRoom(eventId, {
            type: 'QUESTION_TIMER_STARTED',
            payload: {
              eventId,
              questionIndex: state.currentQuestionIndex,
              remainingSeconds: Math.max(0, state.questionRemainingSeconds),
              totalSeconds: totalSec
            }
          });

          if (state.questionRemainingSeconds <= 0) {
            if (state.timerInterval) {
              clearInterval(state.timerInterval);
              state.timerInterval = null;
            }
            this.handleQuestionTimeExpired(state);
          }
        }, 1000);
        break;
      }
    }
  }

  // Handle question timer expiry on server
  private handleQuestionTimeExpired(state: LiveEventState) {
    state.status = 'QUESTION_ENDED';
    const currentQ = state.questions[state.currentQuestionIndex];

    // Broadcast to participants: only notify that question ended (NO correct answer or leaderboard shown to participants)
    this.broadcastToRoom(state.id, {
      type: 'QUESTION_ENDED',
      payload: {
        eventId: state.id,
        questionIndex: state.currentQuestionIndex,
        status: 'QUESTION_ENDED'
      }
    });

    // Send full question review & live leaderboard exclusively to Admin
    this.broadcastToAdmins(state.id, {
      type: 'ADMIN_QUESTION_REVIEW',
      payload: {
        eventId: state.id,
        questionIndex: state.currentQuestionIndex,
        correctOption: currentQ.correctOption,
        explanation: currentQ.explanation,
        leaderboard: this.getLeaderboard(state)
      }
    });
  }

  // Calculate and return current leaderboard
  public getLeaderboard(state: LiveEventState) {
    const list = Array.from(state.scores.values()).map(s => ({
      userId: s.userId,
      userName: s.userName,
      score: s.score,
      correctCount: s.correctCount,
      totalTimeSeconds: Math.round(s.totalTimeSeconds * 10) / 10
    }));

    // Sort: highest score first, then highest correct answers, then lowest time
    list.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
      return a.totalTimeSeconds - b.totalTimeSeconds;
    });

    return list.map((item, index) => ({
      rank: index + 1,
      ...item
    }));
  }

  // Broadcast leaderboard update to event room (Admin clients only)
  public broadcastLeaderboard(state: LiveEventState) {
    const leaderboard = this.getLeaderboard(state);
    this.broadcastToAdmins(state.id, {
      type: 'LEADERBOARD_UPDATED',
      payload: {
        eventId: state.id,
        leaderboard
      }
    });
  }

  // Send state snapshot to a specific client (reconnection or room join)
  public sendEventSnapshot(client: ClientConnection, state: LiveEventState) {
    const currentQ = state.currentQuestionIndex >= 0 && state.currentQuestionIndex < state.questions.length
      ? state.questions[state.currentQuestionIndex]
      : null;

    const userScore = client.userId ? state.scores.get(client.userId) : null;
    const answeredCurrent = currentQ && client.userId ? userScore?.answers.has(currentQ.id) : false;
    const previousAnswer = currentQ && client.userId ? userScore?.answers.get(currentQ.id) : null;
    const isAdmin = client.role === 'ADMIN' || client.role === 'SUPERADMIN';

    // Safe question payload: never leak correct answer or explanation to participants
    let safeQuestion = null;
    if (currentQ) {
      safeQuestion = {
        id: currentQ.id,
        questionText: currentQ.questionText,
        options: currentQ.options,
        points: currentQ.points,
        timerSeconds: currentQ.timerSeconds,
        questionOrder: currentQ.questionOrder,
        ...(isAdmin ? { correctOption: currentQ.correctOption, explanation: currentQ.explanation } : {})
      };
    }

    this.sendToClient(client, {
      type: 'EVENT_STATE_SNAPSHOT',
      payload: {
        eventId: state.id,
        title: state.title,
        description: state.description,
        domain: state.domain,
        status: state.status,
        currentQuestionIndex: state.currentQuestionIndex,
        totalQuestions: state.questions.length,
        questionRemainingSeconds: state.questionRemainingSeconds,
        question: safeQuestion,
        answeredCurrent,
        selectedOption: previousAnswer ? previousAnswer.selectedOption : null,
        // Only admins receive user scores and full leaderboards
        ...(isAdmin ? {
          leaderboard: this.getLeaderboard(state),
          userScore: userScore ? {
            score: userScore.score,
            correctCount: userScore.correctCount,
            totalTimeSeconds: userScore.totalTimeSeconds
          } : null
        } : {}),
        totalRegistered: state.registeredUsers.size
      }
    });
  }

  // Broadcast state snapshot to entire event room
  public broadcastEventSnapshot(state: LiveEventState) {
    for (const [ws, client] of this.clients.entries()) {
      if (ws.readyState === WebSocket.OPEN && client.currentEventId === state.id) {
        this.sendEventSnapshot(client, state);
      }
    }
  }

  // Broadcast event creation / update / deletion to all connected clients
  public broadcastEventListingUpdate(eventType: 'EVENT_CREATED' | 'EVENT_UPDATED' | 'EVENT_DELETED', eventData: any) {
    this.broadcastAll({
      type: eventType,
      payload: eventData
    });
  }

  // Helper: send to single client
  private sendToClient(client: ClientConnection, data: any) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(data));
    }
  }

  // Helper: broadcast to room
  public broadcastToRoom(eventId: string, data: any) {
    const raw = JSON.stringify(data);
    for (const [ws, client] of this.clients.entries()) {
      if (ws.readyState === WebSocket.OPEN && client.currentEventId === eventId) {
        ws.send(raw);
      }
    }
  }

  // Helper: broadcast exclusively to admins in event room
  public broadcastToAdmins(eventId: string, data: any) {
    const raw = JSON.stringify(data);
    for (const [ws, client] of this.clients.entries()) {
      if (ws.readyState === WebSocket.OPEN && client.currentEventId === eventId) {
        if (client.role === 'ADMIN' || client.role === 'SUPERADMIN') {
          ws.send(raw);
        }
      }
    }
  }

  // Helper: broadcast to all connected clients
  public broadcastAll(data: any) {
    const raw = JSON.stringify(data);
    for (const [ws] of this.clients.entries()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(raw);
      }
    }
  }
}

export const realtimeEngine = new RealtimeQuizEngine();
