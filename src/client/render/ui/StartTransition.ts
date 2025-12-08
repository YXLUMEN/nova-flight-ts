import type {IUi} from "./IUi.ts";

interface Hexagon {
    x: number;
    y: number;
    originalX: number;
    originalY: number;
    size: number;
    angle: number; // 飞散方向（弧度）
    speed: number;
    alpha: number;
}

export class StartTransition implements IUi {
    private readonly ctx: CanvasRenderingContext2D;
    private width = 0;
    private height = 0;

    private running = false;
    private readonly promise: Promise<void>;
    private readonly resolve: () => void;

    private readonly hexagons: Hexagon[] = [];
    private readonly hexSize = 30; // 六边形外接圆半径
    private readonly animationDuration = 1500; // ms
    private elapsed = 0;

    private readonly onComplete?: () => void;

    public constructor(ctx: CanvasRenderingContext2D, onComplete?: () => void) {
        this.ctx = ctx;
        this.onComplete = onComplete;
        const {promise, resolve} = Promise.withResolvers<void>();
        this.promise = promise;
        this.resolve = resolve;

        this.running = true;
        this.tick(0);
    }

    public setSize(w: number, h: number): void {
        this.width = w;
        this.height = h;
        this.generateHexGrid();
    }

    private generateHexGrid(): void {
        const {hexSize} = this;
        const hexWidth = hexSize * Math.sqrt(3);
        const hexHeight = hexSize * 2;
        const vertSpacing = hexHeight * 0.75;

        this.hexagons.length = 0;

        let row = 0;
        let y = -hexHeight;
        while (y < this.height + hexHeight) {
            const xOffset = (row % 2 === 0) ? 0 : hexWidth / 2;
            let col = 0;
            let x = xOffset - hexWidth;
            while (x < this.width + hexWidth) {
                const centerX = x + hexWidth / 2;
                const centerY = y + hexSize;

                // 计算从中心飞散的方向
                const dx = centerX - this.width / 2;
                const dy = centerY - this.height / 2;
                const dist = Math.hypot(dx, dy) || 1;
                const angle = Math.atan2(dy, dx);

                // 随机速度（避免完全同步）
                const baseSpeed = 100 + Math.random() * 100;
                const speed = baseSpeed * (dist / Math.max(this.width, this.height));

                this.hexagons.push({
                    x: centerX,
                    y: centerY,
                    originalX: centerX,
                    originalY: centerY,
                    size: hexSize,
                    angle,
                    speed,
                    alpha: 1.0
                });

                x += hexWidth;
                col++;
            }
            y += vertSpacing;
            row++;
        }
    }

    public wait() {
        return this.promise;
    }

    public tick(tickDelta: number): void {
        if (!this.running) return;

        this.elapsed += tickDelta / 1000;
        const progress = Math.min(this.elapsed / this.animationDuration, 1);
        for (const hex of this.hexagons) {
            if (progress >= 0.6) {
                hex.alpha = 1 - ((progress - 0.6) / 0.4);
            }

            // 更新位置：沿角度方向飞出
            const moveDist = hex.speed * tickDelta / 1000;
            hex.x = hex.originalX + Math.cos(hex.angle) * moveDist * progress * 5;
            hex.y = hex.originalY + Math.sin(hex.angle) * moveDist * progress * 5;
        }

        // 检查是否完成
        if (progress >= 1 && this.hexagons.every(h => h.alpha <= 0)) {
            this.destroy();
            return;
        }

        this.render(this.ctx);
        requestAnimationFrame(this.bindTick);
    }

    private bindTick = this.tick.bind(this);

    public render(ctx: CanvasRenderingContext2D): void {
        ctx.clearRect(0, 0, this.width, this.height);

        ctx.save();
        for (const hex of this.hexagons) {
            if (hex.alpha <= 0) continue;

            ctx.save();
            ctx.globalAlpha = hex.alpha;
            ctx.strokeStyle = '#4a90e2';
            ctx.lineWidth = 2;
            ctx.beginPath();

            for (let i = 0; i < 6; i++) {
                const angleDeg = 60 * i - 30;
                const angleRad = (Math.PI / 180) * angleDeg;
                const x = hex.x + hex.size * Math.cos(angleRad);
                const y = hex.y + hex.size * Math.sin(angleRad);
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.closePath();
            ctx.stroke();
            ctx.restore();
        }

        ctx.restore();
    }

    public destroy(): void {
        if (!this.running) return;
        this.running = false;
        this.hexagons.length = 0;
        this.resolve();
        this.onComplete?.();
    }
}