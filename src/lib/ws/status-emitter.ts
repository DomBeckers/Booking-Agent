import type { StatusEvent } from "@/types";

type Listener = (event: StatusEvent) => void;

class StatusEmitter {
  private listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: Omit<StatusEvent, "timestamp">): void {
    const fullEvent: StatusEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };
    for (const listener of this.listeners) {
      try {
        listener(fullEvent);
      } catch {
        // Don't let one bad listener break others
      }
    }
  }
}

// Singleton
export const statusEmitter = new StatusEmitter();
