import type {IUi} from "./IUi.ts";
import {UITheme} from "./theme.ts";
import {easeOutQuad, lerp} from "../../../utils/math/math.ts";

interface DamagePopupEvent {
    x: number;
    y: number;
    preY: number;
    age: number;
    readonly  life: number;
    value: string;
    color: string;
    readonly entityId: number | null;
}

const FADE_DURATION = 0.25;

export class DamagePopupRender implements IUi {
    private readonly activePopups: DamagePopupEvent[] = [];
    private readonly popups = new Map<number, DamagePopupEvent>();

    public tick(tickDelta: number): void {
        for (let i = this.activePopups.length - 1; i >= 0; i--) {
            const popup = this.activePopups[i];
            popup.age += tickDelta;
            if (popup.age < popup.life) continue;

            this.activePopups[i] = this.activePopups[this.activePopups.length - 1];
            this.activePopups.pop();
            if (popup.entityId) this.popups.delete(popup.entityId);
        }
    }

    public spawnPopup(x: number, y: number, value: number, color: string, life: number, entityId?: number): void {
        if (!entityId) {
            this.activePopups.push({
                x: x, y: y, preY: y,
                age: 0, life: life / 20,
                value: this.formatDamage(value),
                color: color,
                entityId: null,
            });
            return;
        }

        const exist = this.popups.get(entityId);
        if (!exist) {
            const event: DamagePopupEvent = {
                x: x, y: y, preY: y,
                age: 0, life: life / 20,
                value: this.formatDamage(value),
                color: color,
                entityId: entityId,
            };
            this.activePopups.push(event);
            this.popups.set(entityId, event);
            return;
        }

        exist.x = x;
        exist.y = y;
        exist.age = exist.life * 0.2;
        exist.value = value === 0 ? '0' : this.formatDamage(Number(exist.value) + value);
    }

    public render(ctx: CanvasRenderingContext2D, tickDelta: number): void {
        if (this.activePopups.length === 0) return;

        ctx.save();
        ctx.font = UITheme.font;

        for (const popup of this.activePopups) {
            const riseOffset = this.riseOffset(popup.age, popup.life);

            let alpha = 1.0;
            const fadeStart = popup.life - FADE_DURATION;
            if (popup.age > fadeStart) {
                alpha = 1 - (popup.age - fadeStart) / FADE_DURATION;
            }

            const drawY = lerp(tickDelta, popup.preY, popup.y - riseOffset);
            popup.preY = drawY;

            ctx.globalAlpha = alpha;
            ctx.fillStyle = popup.color;
            ctx.fillText(popup.value, popup.x, drawY);
        }

        ctx.restore();
    }

    public setSize(): void {
    }

    public destroy(): void {
        this.activePopups.length = 0;
    }

    private riseOffset(age: number, life: number): number {
        const t = age / life;

        if (t < 0.2) {
            return easeOutQuad(t / 0.2) * 20;
        }
        if (t < 0.5) {
            return 20;
        }
        const progress = (t - 0.5) / 0.5;
        return lerp(progress, 10, 60);
    }

    private formatDamage(value: number): string {
        return Number(value.toFixed(1)).toString();
    }
}