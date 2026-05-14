import type {LaserBeamEffect} from "../effect/LaserBeamEffect.ts";

export class LaserBeamManger {
    private readonly maxLasers = 65536;
    private readonly activated = new Set<number>();
    private readonly effects = new Map<number, LaserBeamEffect>();
    private nextId = 0;

    public allocate(): number {
        const id = this.nextId;
        this.nextId = (this.nextId + 1) % this.maxLasers;
        this.release(id);
        return id;
    }

    public release(id: number): void {
        this.activated.delete(id);
        const effect = this.effects.get(id);
        if (!effect) return;
        effect.kill();
        this.effects.delete(id);
    }

    public isActivated(id: number): boolean {
        return this.activated.has(id);
    }

    public markActivated(id: number): void {
        this.activated.add(id);
    }

    public get(id: number): LaserBeamEffect | undefined {
        return this.effects.get(id);
    }

    public set(id: number, effect: LaserBeamEffect): void {
        const existing = this.effects.get(id);
        if (existing && existing.isAlive()) {
            existing.kill();
        }
        this.effects.set(id, effect);
    }
}