import type {Item} from "./Item.ts";

export class ItemCooldownManager {
    private readonly cooldowns = new Map<Item, number>;

    public isCoolingDown(item: Item): boolean {
        return this.cooldowns.has(item);
    }

    public getCooldownTicks(item: Item): number {
        return this.cooldowns.get(item) ?? 0;
    }

    public tick(): void {
        if (this.cooldowns.size === 0) return;

        this.cooldowns.entries().forEach(([item, value]) => {
            const newValue = value > 0 ? value - 1 : 0;
            if (newValue <= 0) {
                this.onCooldownUpdate(item);
                this.cooldowns.delete(item);
                return;
            }

            this.cooldowns.set(item, newValue);
        });
    }

    public set(item: Item, ticks: number): void {
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