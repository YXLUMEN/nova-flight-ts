import type {GuiManager} from "./GuiManager.ts";
import type {GuiNode} from "./GuiNode.ts";
import {GuiTheme} from "./theme.ts";
import {textOf} from "./types.ts";
import {GuiContainer} from "./GuiContainer.ts";
import {GuiDraw} from "./GuiDraw.ts";

/**
 * 屏幕:挂载到 GuiManager 的顶层容器(控件树根节点)。
 *
 * 屏幕实例可复用(push → pop → push):每次打开 / 关闭都会触发 onOpened / onClosed;
 * 焦点、悬停与布局脏标记由框架重置,界面自身的瞬时状态应在 onOpened 中初始化。
 */
export class GuiScreen extends GuiContainer {
    public manager: GuiManager | null = null;

    protected background: string | null = null; // 每帧清屏填充色(不透明界面常用),null 表示透明叠层
    protected closeOnEscape = false; // Esc 是否关闭本屏幕
    protected closeOnOutsideClick = false; // 点击非子控件区域(空白背景)是否关闭本屏幕
    protected tooltipDelay = 350; // 工具提示悬停延时(毫秒)

    private focusNode: GuiNode | null = null;
    private hoverTarget: GuiNode | null = null;
    private hoverTime = 0;
    private pointerX = 0;
    private pointerY = 0;

    private closed = false;

    public getFocused(): GuiNode | null {
        return this.focusNode;
    }

    /** 设置屏幕尺寸(由管理器在尺寸变化 / 打开时调用) */
    public setScreenSize(w: number, h: number): void {
        const width = Math.max(0, w);
        const height = Math.max(0, h);
        if (this.width === width && this.height === height) return;

        this.width = width;
        this.height = height;
        this.markLayoutDirty();
    }

    public setBackground(color: string | null) {
        if (color === this.background) return;
        this.background = color;
        this.markPaintDirty();
    }

    public override relayout(ctx: CanvasRenderingContext2D): void {
        // 屏幕自身没有父容器,绝对坐标即画布坐标
        this.absX = 0;
        this.absY = 0;
        super.relayout(ctx);
    }

    public override tick(dt: number): void {
        super.tick(dt);

        // 等待工具提示到达延时期间必须保持重绘,否则提示不会浮现
        if (this.hoverTarget?.tooltip && this.hoverTime < this.tooltipDelay) {
            this.hoverTime += dt;
            this.markPaintDirty();
        }
    }

    public override render(ctx: CanvasRenderingContext2D): void {
        this.paintDirty = false; // 本帧已提交绘制(不可见时同样视为已提交)
        if (!this.visible) return;

        if (this.layoutDirty) {
            this.relayout(ctx);
            this.layoutDirty = false;
        }

        super.render(ctx);
        this.renderTooltip(ctx);
    }

    /** 屏幕背景:background 为 null 时保持透明叠层 */
    protected override renderSelf(ctx: CanvasRenderingContext2D): void {
        if (this.background === null) return;

        ctx.fillStyle = this.background;
        ctx.fillRect(0, 0, this.width, this.height);
    }

    /**
     * 更新指针位置并刷新悬停目标(由管理器在指针移动时调用)。
     * 返回当前悬停控件,供管理器直接分发指针移动,避免重复命中测试。
     */
    public updateHover(x: number, y: number): GuiNode | null {
        const tooltipShown = this.isTooltipShown();
        this.pointerX = x;
        this.pointerY = y;
        this.refreshHover();

        // 提示显示期间需要跟随指针重绘
        if (tooltipShown) this.markPaintDirty();
        return this.hoverTarget;
    }

    /** 指针离开画布:清除悬停 */
    public clearHover(): void {
        this.hoverTarget?.setHovered(false);
        this.hoverTarget = null;
        this.hoverTime = 0;
    }

    /** 焦点管理 */
    public setFocus(node: GuiNode | null): void {
        if (this.focusNode === node) return;

        if (node !== null && (!node.focusable || !node.visible || !node.enabled)) return;

        this.focusNode?.setFocused(false);
        this.focusNode = node;
        node?.setFocused(true);
    }

    /** 聚焦当前焦点控件后(shift 反向)的下一个可聚焦控件 */
    public moveFocus(next: boolean): void {
        const list = this.collectFocusable();
        if (list.length === 0) return;

        const current = this.focusNode;
        let index = current === null ? -1 : list.indexOf(current);
        if (index < 0) index = next ? -1 : 0;

        index = (index + (next ? 1 : -1) + list.length) % list.length;
        this.setFocus(list[index]);
    }

    public close(): void {
        this.manager?.pop(this);
    }

    protected onOpened(): void {
    }

    protected onClosed(): void {
    }

    public override keyDown(event: KeyboardEvent): boolean {
        if (event.code === 'Tab') {
            this.moveFocus(!event.shiftKey);
            return true;
        }
        if (event.code === 'Escape' && this.closeOnEscape) {
            this.close();
            return true;
        }
        return false;
    }

    /**
     * @readonly
     * @inner
     * 由管理器在 push / pop 时调用
     * */
    public notifyOpened(): void {
        this.closed = false;
        this.markLayoutDirty();
        this.onOpened();
    }

    // 内部实现

    /**
     * @readonly
     * @inner
     * 由管理器在 pop 时调用(保证只回调一次)
     * */
    public notifyClosed(): void {
        if (this.closed) return;
        this.closed = true;

        this.setFocus(null);
        this.clearHover();
        this.onClosed();
    }

    protected override onBackgroundPointerDown(_event: PointerEvent): boolean {
        if (this.closeOnOutsideClick) {
            this.close();
            return true;
        }
        return false;
    }

    /** 工具提示是否已显示(用于判断是否需要跟随指针重绘) */
    private isTooltipShown(): boolean {
        return this.hoverTarget !== null && this.hoverTarget.tooltip !== null &&
            this.hoverTime >= this.tooltipDelay;
    }

    private refreshHover(): void {
        const target = this.hitTest(this.pointerX, this.pointerY);
        if (target === this.hoverTarget) return;

        this.hoverTarget?.setHovered(false);
        this.hoverTarget = target;
        this.hoverTime = 0;
        target?.setHovered(true);
    }

    private renderTooltip(ctx: CanvasRenderingContext2D): void {
        const tooltip = this.hoverTarget?.tooltip;
        if (!tooltip || this.hoverTime < this.tooltipDelay) return;

        const text = textOf(tooltip);
        const font = GuiTheme.font(13);
        const padX = 10;
        const padY = 6;
        const lineHeight = GuiTheme.lineHeight(13);

        const lines = text.split('\n');
        let maxWidth = 0;
        for (const line of lines) {
            maxWidth = Math.max(maxWidth, GuiDraw.measure(line, font));
        }

        const boxW = maxWidth + padX * 2;
        const boxH = lines.length * lineHeight + padY * 2 - (lines.length - 1) * 2;

        let x = this.pointerX + 14;
        let y = this.pointerY + 16;
        if (x + boxW > this.width) x = this.pointerX - boxW - 10;
        if (y + boxH > this.height) y = this.pointerY - boxH - 12;
        x = Math.max(4, x);
        y = Math.max(4, y);

        ctx.save();
        ctx.fillStyle = "rgba(6,10,18,0.92)";
        ctx.strokeStyle = GuiTheme.colors.border;
        ctx.beginPath();
        GuiDraw.roundRectPath(ctx, x, y, boxW, boxH, 4);
        ctx.fill();
        ctx.stroke();

        let ty = y + padY;
        for (const line of lines) {
            GuiDraw.text(ctx, x + padX, ty, line, font, undefined, undefined, 'top');
            ty += lineHeight;
        }
        ctx.restore();
    }
}
