import type {Item} from "./Item.ts";

export class ItemCooldownManager {
    private readonly cooldowns: Map<Item, number> = new Map;

    public isCoolingDown(item: Item): boolean {
        return this.cooldowns.has(item);
    }

    public getCooldownTicks(item: Item): number {
        return this.cooldowns.get(item) ?? 0;
    }

    public tick(): void {
        if (this.cooldowns.size === 0) return;

        for (const [item, value] of this.cooldowns) {
            const newValue = value > 0 ? value - 1 : 0;
            if (newValue <= 0) {
                this.onCooldownUpdate(item);
                this.cooldowns.delete(item);
                continue;
            }

            this.cooldowns.set(item, newValue);
        }
    }

    public set(item: Item, ticks: number): void {
        ticks = Math.ceil(ticks);
        this.cooldowns.set(item, ticks);
        this.onCooldownUpdate(item, ticks);
    }

    public delete(item: Item): void {
        this.cooldowns.delete(item);
        this.onCooldownUpdate(item);
    }

    protected onCooldownUpdate(_item: Item, _duration: number = 0): void {
    }
}