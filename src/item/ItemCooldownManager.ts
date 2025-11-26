import type {Item} from "./Item.ts";

export class ItemCooldownManager {
    private readonly cooldowns = new Map<Item, number>;

    public isCoolingDown(item: Item): boolean {
        return this.cooldowns.has(item);
    }

    public getCooldownTicks(item: Item): number {
        return this.cooldowns.get(item) ?? 0;
    }

    public update(): void {
        if (this.cooldowns.size === 0) return;

        this.cooldowns.entries().forEach(([key, value]) => {
            const newValue = value > 0 ? value - 1 : 0;
            if (newValue <= 0) {
                this.onCooldownUpdate(key);
                this.cooldowns.delete(key);
                return;
            }

            this.cooldowns.set(key, newValue);
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