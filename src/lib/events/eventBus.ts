// ─── EVENT BUS ──────────────────────────────────────────────────────────────
// Central pub/sub event bus for real-time updates.
// Server-side: API routes emit events here, SSE feed subscribes and streams to clients.
// Replaces the stub SSE feed that only sent a single demo event.

export type MCEventType =
  | "agent_status"
  | "task_update"
  | "session_event"
  | "log_entry"
  | "token_update"
  | "pipeline_progress"
  | "notification"
  | "alert_fired"
  | "chat_message"
  | "system_health";

export interface MCEvent {
  id: string;
  type: MCEventType;
  data: Record<string, unknown>;
  timestamp: string;
}

type Listener = (event: MCEvent) => void;

class EventBus {
  private listeners = new Map<string, Set<Listener>>();
  private allListeners = new Set<Listener>();
  private eventCounter = 0;

  emit(type: MCEventType, data: Record<string, unknown>): MCEvent {
    const event: MCEvent = {
      id: `evt-${++this.eventCounter}-${Date.now()}`,
      type,
      data,
      timestamp: new Date().toISOString(),
    };

    // Notify type-specific listeners
    const typeListeners = this.listeners.get(type);
    if (typeListeners) {
      for (const listener of typeListeners) {
        try {
          listener(event);
        } catch (err) {
          console.error(`[EventBus] Listener error for ${type}:`, err);
        }
      }
    }

    // Notify wildcard listeners (SSE feed uses this)
    for (const listener of this.allListeners) {
      try {
        listener(event);
      } catch (err) {
        console.error("[EventBus] Wildcard listener error:", err);
      }
    }

    return event;
  }

  on(type: MCEventType, listener: Listener): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
    return () => this.listeners.get(type)?.delete(listener);
  }

  onAll(listener: Listener): () => void {
    this.allListeners.add(listener);
    return () => this.allListeners.delete(listener);
  }

  removeAllListeners(): void {
    this.listeners.clear();
    this.allListeners.clear();
  }

  get subscriberCount(): number {
    let count = this.allListeners.size;
    for (const set of this.listeners.values()) {
      count += set.size;
    }
    return count;
  }
}

// Singleton — shared across all API routes in the same process
export const eventBus = new EventBus();
