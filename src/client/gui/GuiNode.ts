import type {GuiContainer} from "./GuiContainer.ts";
import type {GuiText} from "./types.ts";

/**
 * 控件树节点基类。
 *
 * 职责:
 *  - 几何:坐标(x/y 相对父容器内容区),尺寸(width/height),以及布局后缓存的绝对坐标(absX/absY);
 *  - 状态:可见 / 可用 / 可聚焦 / 焦点 / 悬停;
 *  - 生命周期与虚拟钩子:measure(自动尺寸)、relayout(布局)、tick(逐帧)、render(绘制);
 *  - 输入:指针 / 滚轮 / 键盘统一以受控方法暴露,由 GuiScreen 负责分发。
 *
 * 约定:所有控件坐标使用画布 CSS 像素(与游戏渲染一致)。
 */
export abstract class GuiNode {
    // 父容器
    public parent: GuiContainer | null = null;

    // 相对父容器内容区的坐标
    public x = 0;
    public y = 0;

    // 布局后缓存的绝对坐标(画布坐标系)
    public absX = 0;
    public absY = 0;

    public width = 0;
    public height = 0;

    public visible = true;
    public enabled = true;
    public focusable = false; // 是否可被 Tab / 点击获得焦点

    public focused = false; // 当前是否持有屏幕焦点(由屏幕统一管理)
    public hovered = false; // 指针是否悬停于控件之上(由屏幕统一刷新)
    public tooltip: GuiText | null = null; // 悬停提示文案

    public layoutDirty = true; // 布局脏标记:仅对控件树根节点(屏幕)有意义
    public paintDirty = true; // 重绘脏标记:仅对控件树根节点(屏幕)有意义

    protected autoWidth = false; // 宽度是否自动(width 为 0 时首次测量后保持自动)
    protected autoHeight = false; // 高度是否自动

    public setPos(x: number, y: number): this {
        this.x = x;
        this.y = y;
        this.markLayoutDirty();
        return this;
    }

    public setSize(w: number, h: number): this {
        this.width = Math.max(0, w);
        this.height = Math.max(0, h);
        this.autoWidth = false;
        this.autoHeight = false;
        this.markLayoutDirty();
        return this;
    }

    public setBounds(x: number, y: number, w: number, h: number): this {
        this.x = x;
        this.y = y;
        this.width = Math.max(0, w);
        this.height = Math.max(0, h);
        this.autoWidth = false;
        this.autoHeight = false;
        this.markLayoutDirty();
        return this;
    }

    public setVisible(visible: boolean): this {
        this.visible = visible;
        this.markLayoutDirty();
        return this;
    }

    public setEnabled(enabled: boolean): this {
        this.enabled = enabled;
        this.markPaintDirty();
        return this;
    }

    public setTooltip(tooltip: GuiText | null): this {
        this.tooltip = tooltip;
        this.markPaintDirty();
        return this;
    }

    /** 判断绝对坐标点是否位于控件盒内 */
    public containsPoint(px: number, py: number): boolean {
        return this.width > 0 &&
            this.height > 0 &&
            px >= this.absX && px < this.absX + this.width &&
            py >= this.absY && py < this.absY + this.height;
    }

    /** 命中测试:返回包含该点的最深可见控件(叶子优先) */
    public hitTest(px: number, py: number): GuiNode | null {
        if (!this.visible || !this.containsPoint(px, py)) return null;
        return this;
    }

    /** 标记需要重绘:仅视觉状态变化时使用(几何变化请用 markLayoutDirty) */
    public markPaintDirty(): void {
        this.root().paintDirty = true;
    }

    /** 沿父链向上找到根节点并标记需要重新布局(布局变化必然需要重绘) */
    public markLayoutDirty(): void {
        const root = this.root();
        root.layoutDirty = true;
        root.paintDirty = true;
    }

    /** 所在控件树根节点(屏幕) */
    private root(): GuiNode {
        let node: GuiNode = this;
        while (node.parent) node = node.parent;
        return node;
    }

    /**
     * 测量自身内容并调整自动尺寸(如文本控件根据字号计算宽高)。
     * 仅在有自动尺寸需求时被调用。
     */
    public measure(_ctx: CanvasRenderingContext2D): void {
    }

    /**
     * 布局自身(叶子节点一般无需处理;容器负责摆放子项)。
     */
    public relayout(_ctx: CanvasRenderingContext2D): void {
    }

    /** 逐帧推进(动画 / 闪烁等),dt 单位毫秒 */
    public tick(_dt: number): void {
    }

    /** 按键事件,返回 true 表示已消费 */
    public keyDown(_event: KeyboardEvent): boolean {
        return false;
    }

    /** 可打印字符输入(优先于 keyDown 的字符分支,避免组合键干扰). 返回 true 表示已消费 */
    public insertChar(_char: string): boolean {
        return false;
    }

    /** 指针按下。返回 this 表示消费并捕获指针(后续 move/up 会持续送达) */
    public pointerDown(_event: PointerEvent): GuiNode | null {
        return null;
    }

    /** 指针抬起(捕获目标必然收到,即使已移出控件) */
    public pointerUp(_event: PointerEvent): void {
    }

    /** 指针交互被系统取消(触摸 / 笔等):需丢弃按下态且不触发点击 */
    public pointerCancel(): void {
    }

    /** 指针移动(悬停中或被捕获目标) */
    public pointerMove(_event: PointerEvent): void {
    }

    /** 滚轮. 返回 true 表示已消费 */
    public wheel(_event: WheelEvent): boolean {
        return false;
    }

    public setFocused(focused: boolean): void {
        if (this.focused === focused) return;
        this.focused = focused;
        this.markPaintDirty();
    }

    public setHovered(hovered: boolean): void {
        if (this.hovered === hovered) return;
        this.hovered = hovered;
        this.markPaintDirty();
    }

    public render(ctx: CanvasRenderingContext2D): void {
        if (!this.visible) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        this.renderSelf(ctx);
        ctx.restore();
    }

    /**
     * 绘制自身(坐标为自身左上角 0,0 起). 叶子控件在此实现视觉。
     */
    protected renderSelf(_ctx: CanvasRenderingContext2D): void {
    }
}
