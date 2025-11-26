export class SessionAllocator {
    private readonly freeIds: number[] = [];
    private nextId: number = 1;

    public allocate(): number | null {
        if (this.freeIds.length > 0) {
            return this.freeIds.shift() ?? null;
        }

        this.nextId++;
        if (this.nextId >= 255 || this.nextId <= 0) {
            this.nextId = 1;
        }

        return this.nextId;
    }

    public deallocate(id: number): void {
        if (id === 0) return;
        this.freeIds.push(id);
    }
}