import type { Platform } from "@/types";

interface PlatformSchedule {
  intervalMs: number;
  lastCheckAt: number;
  timer: ReturnType<typeof setTimeout> | null;
  jitterMs: number;
}

export class Scheduler {
  private schedules = new Map<Platform, PlatformSchedule>();
  private checkCallback: ((platform: Platform) => Promise<void>) | null = null;
  private running = false;

  constructor() {}

  setCheckCallback(callback: (platform: Platform) => Promise<void>): void {
    this.checkCallback = callback;
  }

  addPlatform(platform: Platform, intervalMs: number): void {
    this.schedules.set(platform, {
      intervalMs,
      lastCheckAt: 0,
      timer: null,
      jitterMs: Math.floor(intervalMs * 0.2), // 20% jitter
    });
  }

  removePlatform(platform: Platform): void {
    const schedule = this.schedules.get(platform);
    if (schedule?.timer) {
      clearTimeout(schedule.timer);
    }
    this.schedules.delete(platform);
  }

  start(): void {
    if (this.running) return;
    this.running = true;

    for (const [platform] of this.schedules) {
      this.scheduleNext(platform);
    }
  }

  pause(): void {
    this.running = false;
    for (const [, schedule] of this.schedules) {
      if (schedule.timer) {
        clearTimeout(schedule.timer);
        schedule.timer = null;
      }
    }
  }

  stop(): void {
    this.pause();
    this.schedules.clear();
  }

  private scheduleNext(platform: Platform): void {
    if (!this.running) return;

    const schedule = this.schedules.get(platform);
    if (!schedule) return;

    const jitter = Math.floor(Math.random() * schedule.jitterMs * 2) - schedule.jitterMs;
    const delay = Math.max(1000, schedule.intervalMs + jitter);

    schedule.timer = setTimeout(async () => {
      if (!this.running) return;

      schedule.lastCheckAt = Date.now();

      try {
        if (this.checkCallback) {
          await this.checkCallback(platform);
        }
      } catch (error) {
        console.error(`[Scheduler] Error checking ${platform}:`, error);
      }

      // Schedule next check
      this.scheduleNext(platform);
    }, delay);
  }

  getLastCheckAt(platform: Platform): number {
    return this.schedules.get(platform)?.lastCheckAt ?? 0;
  }

  isRunning(): boolean {
    return this.running;
  }
}
