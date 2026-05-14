export class LatencyCalculator {
    private readonly alpha = 1 / 8;         // 平滑因子
    private readonly beta = 1 / 4;          // 方差平滑因子

    private lastPingTime: number = 0;
    private latency: number = 0;
    private sRtt: number = 0;    // smoothed RTT
    private rttVar: number = 0;  // RTT variance

    public onPong(): void {
        this.smoothLatency(performance.now() - this.lastPingTime);
    }

    public onPing(): void {
        this.lastPingTime = performance.now();
    }

    public getLatency(): number {
        return this.latency;
    }

    private smoothLatency(rtt: number): void {
        rtt /= 2;

        if (this.sRtt === 0) {
            this.sRtt = rtt;
            this.rttVar = rtt / 2;
            this.latency = rtt;
            return;
        }

        // RTT 方差
        this.rttVar = (1 - this.beta) * this.rttVar + this.beta * Math.abs(this.sRtt - rtt);
        // 更新平滑 RTT
        this.sRtt = (1 - this.alpha) * this.sRtt + this.alpha * rtt;

        // S_RTT + 补偿项
        this.latency = this.sRtt;
    }
}