import {UITheme} from "./theme.ts";
import {easeOutQuad, lerp, toFixedTrim} from "../../../utils/math/math.ts";

const MAX_POPS = 127;

export class DamagePopup {
    private readonly font = `bold ${UITheme.font}`;

    private readonly popupPool: DamagePopupEvent[] = [];
    private readonly activePopups: DamagePopupEvent[] = [];
    private popups: Map<number, DamagePopupEvent> = new Map();

    public tick(): void {
        for (let i = this.activePopups.length - 1; i >= 0; i--) {
            const popup = this.activePopups[i];
            popup.age++;
            if (popup.age < popup.life) continue;

            this.activePopups[i] = this.activePopups[this.activePopups.length - 1];
            this.activePopups.pop();

            if (popup.entityId) this.popups.delete(popup.entityId);
            this.popupPool.push(popup);
        }
    }

    private add(
        x: number, y: number,
        value: number,
        color: string,
        life: number,
        entityId: number | null,
    ): DamagePopupEvent | null {
        if (this.activePopups.length > MAX_POPS) return null;

        let event = this.popupPool.pop();
        if (event) {
            event.x = x;
            event.y = y;
            event.preY = y;
            event.value = this.formatDamage(value);
            event.color = color;
            event.age = 0;
            event.life = life;
            event.entityId = entityId;
        } else {
            event = {
                x: x, y: y, preY: y,
                age: 0, life: life,
                entityId: entityId,
                value: this.formatDamage(value),
                color: color,
            };
        }
        this.activePopups.push(event);
        return event;
    }

    public spawnPopup(
        x: number, y: number,
        value: number,
        color: string,
        life: number,
        entityId?: number,
        force = false,
    ): void {
        if (entityId == null) {
            this.add(x, y, value, color, life, null);
            return;
        }

        const exist = this.popups.get(entityId);
        if (!exist || force) {
            const event = this.add(x, y, value, color, life, entityId);
            if (event) this.popups.set(entityId, event);
            return;
        }

        if (exist.color !== color) {
            exist.y -= 20;
            this.popups.delete(entityId);
            this.spawnPopup(x, y, value, color, life, entityId, true);
            return;
        }

        exist.x = x;
        exist.y = y;
        exist.age = exist.life * 0.2;
        exist.value = value === 0 ? '0' : this.formatDamage(Number(exist.value) + value);
    }

    public render(ctx: CanvasRenderingContext2D, tickDelta: number): void {
        if (this.activePopups.length === 0) return;

        ctx.font = this.font;
        const FADE_DURATION = 0.25;
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

        ctx.globalAlpha = 1;
    }

    public dispose(): void {
        this.activePopups.length = 0;
        this.popupPool.length = 0;
        this.popups.clear();
        this.popups = new Map();
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
        return String(toFixedTrim(value, 1));
    }
}

interface DamagePopupEvent {
    x: number;
    y: number;
    preY: number;
    age: number;
    life: number;
    entityId: number | null;
    value: string;
    color: string;
}