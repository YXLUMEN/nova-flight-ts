type Entry = { size: number, id: string };

export class PacketSizeProfiler {
    public static readonly INSTANCE = new PacketSizeProfiler();

    private entries: Entry[] = [];

    public record(size: number, id: string = ''): void {
        this.entries.push({size, id});
    }

    public getStats() {
        if (this.entries.length === 0) {
            return null;
        }

        const sorted = this.entries
            .toSorted((a, b) => a.size - b.size);

        const len = sorted.length;
        const p50 = sorted[Math.floor(len * 0.5)];
        const p90 = sorted[Math.floor(len * 0.9)];
        const p95 = sorted[Math.floor(len * 0.95)];
        const p99 = sorted[Math.floor(len * 0.99)];
        const max = sorted[len - 1];
        const avg = sorted.reduce((a, b) => a + b.size, 0) / len;

        return {
            count: len,
            average: Math.round(avg),
            p50,
            p90,
            p95,
            p99,
            max,
            distribution: this.getDistribution(sorted)
        };
    }

    private getDistribution(sorted: Entry[]): Record<string, number> {
        const bins = [
            {name: '1-64', min: 1, max: 64},
            {name: '65-256', min: 65, max: 256},
            {name: '257-1024', min: 257, max: 1024},
            {name: '1025-4096', min: 1025, max: 4096},
            {name: '>4096', min: 4097, max: Infinity}
        ];

        const dist: Record<string, number> = {};
        for (const bin of bins) {
            dist[bin.name] = sorted.filter(s => s.size >= bin.min && s.size <= bin.max).length;
        }
        return dist;
    }

    public getRawSizes(): Entry[] {
        return [...this.entries];
    }
}