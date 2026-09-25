import {GuiNode} from "./GuiNode.ts";
import type {GuiAlign, GuiFlow} from "./types.ts";

/**
 * 容器节点:持有有序子控件并负责布局与事件分发。
 *
 * 布局模型:
 *  - 子控件坐标相对"内容区"原点(即容器左上角 + padding);
 *  - flow = null(默认):子控件位置完全手动,适合自由排版;
 *  - flow = "column" / "row":按顺序纵向 / 横向堆叠子控件(间距 spacing),
 *    交叉轴方向按 align 对齐;
 *  - clip = true 时超出内容区的子控件被裁剪。
 *
 * 事件分发:
 *  - 指针 / 滚轮:按绘制顺序(后者在上)命中最上层子控件,未被消费时回落到背景回调;
 *  - 未裁剪(clip = false)的容器不限制子控件越界命中,clip = true 时按自身盒裁剪命中与分发;
 *  - 键盘:默认不消费,交由屏幕处理焦点遍历等逻辑。
 */
export class GuiContainer extends GuiNode {
    /** 统一内边距(CSS 像素) */
    public padding = 0;

    /** 流式布局方向 */
    public flow: GuiFlow = null;

    /** 子项间距(仅流式布局) */
    public spacing = 0;

    /** 交叉轴对齐(仅流式布局) */
    public align: GuiAlign = "center";

    /** 是否裁剪超出内容区的子控件 */
    public clip = false;

    protected children: GuiNode[] = [];

    public add(child: GuiNode): this {
        if (child.parent === this) return this;
        child.parent?.remove(child);
        child.parent = this;
        this.children.push(child);
        this.markLayoutDirty();
        return this;
    }

    public addAll(...nodes: GuiNode[]): this {
        for (const node of nodes) this.add(node);
        return this;
    }

    public remove(child: GuiNode): this {
        const index = this.children.indexOf(child);
        if (index < 0) return this;

        this.children.splice(index, 1);
        child.parent = null;
        this.markLayoutDirty();
        return this;
    }

    public clear(): void {
        for (const child of this.children) child.parent = null;
        this.children.length = 0;
        this.markLayoutDirty();
    }

    public setPadding(padding: number): this {
        this.padding = Math.max(0, padding);
        this.markLayoutDirty();
        return this;
    }

    public setFlow(flow: GuiFlow, spacing: number = 0): this {
        this.flow = flow;
        this.spacing = Math.max(0, spacing);
        this.markLayoutDirty();
        return this;
    }

    public setAlign(align: GuiAlign): this {
        this.align = align;
        this.markLayoutDirty();
        return this;
    }

    public setClip(clip: boolean): this {
        this.clip = clip;
        this.markPaintDirty();
        return this;
    }

    /** 测量整棵子树(供需要自动尺寸的叶子控件调整自身尺寸) */
    public override measure(ctx: CanvasRenderingContext2D): void {
        for (const child of this.children) {
            if (!child.visible) continue;
            child.measure(ctx);
        }
    }

    /** 布局:先完成子树测量,再按流式规则摆位,最后递归子容器并缓存绝对坐标 */
    public override relayout(ctx: CanvasRenderingContext2D): void {
        for (const child of this.children) {
            if (!child.visible) continue;
            child.measure(ctx);
        }

        this.resolveFlowPositions();

        const contentLeft = this.absX + this.padding;
        const contentTop = this.absY + this.padding;
        for (const child of this.children) {
            if (!child.visible) continue;
            child.absX = contentLeft + child.x;
            child.absY = contentTop + child.y;
            child.relayout(ctx);
        }
    }

    public override tick(dt: number): void {
        for (const child of this.children) {
            if (!child.visible) continue;
            child.tick(dt);
        }
    }

    /**
     * 命中测试:子控件(自上层向下)优先,空区域命中容器自身。
     * 未裁剪的容器不限制子控件越界命中(clip = false),clip = true 时超出自身盒一律不命中。
     */
    public override hitTest(px: number, py: number): GuiNode | null {
        if (!this.visible) return null;
        if (this.clip && !this.containsPoint(px, py)) return null;

        const hit = this.hitChild(px, py);
        if (hit !== null) return hit;
        return this.containsPoint(px, py) ? this : null;
    }

    /** 命中该点的最上层子控件(未裁剪的容器允许子控件越界) */
    private hitChild(px: number, py: number): GuiNode | null {
        for (let i = this.children.length - 1; i >= 0; i--) {
            const child = this.children[i];
            if (!child.visible) continue;
            const hit = child.hitTest(px, py);
            if (hit !== null) return hit;
        }
        return null;
    }

    public override pointerDown(event: PointerEvent): GuiNode | null {
        if (!this.visible || !this.enabled) return null;
        if (this.clip && !this.containsPoint(event.offsetX, event.offsetY)) return null;

        for (let i = this.children.length - 1; i >= 0; i--) {
            const child = this.children[i];
            if (!child.visible) continue;

            const hit = child.pointerDown(event);
            if (hit !== null) return hit;
        }

        if (this.containsPoint(event.offsetX, event.offsetY) && this.onBackgroundPointerDown(event)) {
            return this;
        }
        return null;
    }

    public override pointerMove(event: PointerEvent): void {
        const hit = this.hitChild(event.offsetX, event.offsetY);
        if (hit !== null) {
            hit.pointerMove(event);
            return;
        }
        this.onPointerMoveSelf(event);
    }

    public override wheel(event: WheelEvent): boolean {
        if (!this.visible || !this.enabled) return false;
        if (this.clip && !this.containsPoint(event.offsetX, event.offsetY)) return false;

        const hit = this.hitChild(event.offsetX, event.offsetY);
        if (hit !== null && hit.wheel(event)) return true;

        return this.containsPoint(event.offsetX, event.offsetY) && this.onWheelSelf(event);
    }

    public override keyDown(_event: KeyboardEvent): boolean {
        return false;
    }

    public override render(ctx: CanvasRenderingContext2D): void {
        if (!this.visible) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        this.renderSelf(ctx);

        // 内容区 = 自身盒内缩 padding
        ctx.translate(this.padding, this.padding);
        const contentW = this.width - this.padding * 2;
        const contentH = this.height - this.padding * 2;

        if (this.clip && contentW > 0 && contentH > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, contentW, contentH);
            ctx.clip();
            for (const child of this.children) child.render(ctx);
            ctx.restore();
        } else {
            for (const child of this.children) child.render(ctx);
        }
        ctx.restore();
    }

    /** 按绘制顺序收集可聚焦叶子控件 */
    public collectFocusable(): GuiNode[] {
        const out: GuiNode[] = [];
        this.collectFocusableInto(out);
        return out;
    }

    /** 指针事件未被任何子控件消费且落在容器内时回调(默认不消费) */
    protected onBackgroundPointerDown(_event: PointerEvent): boolean {
        return false;
    }

    /** 指针移动到空白区域回调 */
    protected onPointerMoveSelf(_event: PointerEvent): void {
    }

    /** 滚轮落在空白区域回调 */
    protected onWheelSelf(_event: WheelEvent): boolean {
        return false;
    }

    private collectFocusableInto(out: GuiNode[]): void {
        for (const child of this.children) {
            if (!child.visible || !child.enabled) continue;

            if (child instanceof GuiContainer) {
                child.collectFocusableInto(out);
                continue;
            }
            if (child.focusable) {
                out.push(child);
            }
        }
    }

    /** 流式布局摆位:仅修改子控件 x/y(手动模式不干预) */
    private resolveFlowPositions(): void {
        if (this.flow === null) return;

        const contentW = Math.max(0, this.width - this.padding * 2);
        const contentH = Math.max(0, this.height - this.padding * 2);

        if (this.flow === "column") {
            let cursor = 0;
            for (const child of this.children) {
                if (!child.visible) continue;
                child.y = cursor;
                child.x = this.resolveCrossOffset(child.width, contentW);
                cursor += child.height + this.spacing;
            }
            return;
        }

        // row
        let cursor = 0;
        for (const child of this.children) {
            if (!child.visible) continue;
            child.x = cursor;
            child.y = this.resolveCrossOffset(child.height, contentH);
            cursor += child.width + this.spacing;
        }
    }

    private resolveCrossOffset(childSize: number, contentSize: number): number {
        switch (this.align) {
            case "center":
                return Math.max(0, (contentSize - childSize) / 2);
            case "end":
                return Math.max(0, contentSize - childSize);
            default:
                return 0;
        }
    }
}
