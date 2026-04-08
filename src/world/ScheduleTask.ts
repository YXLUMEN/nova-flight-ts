import {AtomicInteger} from "../utils/collection/AtomicInteger.ts";
import type {Schedule, TimerTask} from "../type/ITimer.ts";
import type {Supplier} from "../type/types.ts";

export class ScheduleTask {
    private time = 0;
    private nextTimerId = new AtomicInteger();
    private timers: TimerTask[] = [];

    public tick(tickDelta: number): void {
        this.time += tickDelta;
        this.processTimers();
    }

    public schedule(delaySec: number, fn: Supplier<void>): Schedule {
        const t: TimerTask = this.createTimerTask(fn, delaySec, false);
        this.insertTimer(t);
        return {id: t.id, cancel: () => (t.canceled = true)};
    }

    public scheduleInterval(intervalSec: number, fn: Supplier<void>): Schedule {
        const t: TimerTask = this.createTimerTask(fn, intervalSec, true, intervalSec);
        this.insertTimer(t);
        return {id: t.id, cancel: () => (t.canceled = true)};
    }

    private createTimerTask(fn: Supplier<void>, delaySec: number, repeat: boolean, interval?: number): TimerTask {
        return {
            id: this.nextTimerId.incrementAndGet(),
            at: this.time + Math.max(0, delaySec),
            fn,
            repeat,
            interval: interval !== undefined ? Math.max(0, interval) : undefined,
            canceled: false
        };
    }

    private insertTimer(t: TimerTask) {
        let lo = 0, hi = this.timers.length;
        while (lo < hi) {
            const mid = (lo + hi) >>> 1;
            if (this.timers[mid].at <= t.at) lo = mid + 1;
            else hi = mid;
        }
        this.timers.splice(lo, 0, t);
    }

    private processTimers(): void {
        while (this.timers.length && this.timers[0].at <= this.time) {
            const t = this.timers.shift()!;
            if (t.canceled) continue;

            if (!t.repeat) {
                t.fn();
                continue;
            }

            // 重复任务,补齐到当前世界时间; 可能在长时间卡顿时触发多次
            if (t.interval! <= 0) {
                t.fn();
                continue;
            } // 容错
            do {
                t.fn();
                t.at += t.interval!;
            } while (t.at <= this.time && !t.canceled);

            if (!t.canceled) this.insertTimer(t);
        }
    }

    public getTime(): number {
        return this.time;
    }

    public clear(): void {
        this.timers.length = 0;
        this.time = 0;
        this.nextTimerId.reset();
    }
}