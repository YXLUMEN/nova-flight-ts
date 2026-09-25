import type {GuiScreen} from "./GuiScreen.ts";
import type {GuiNode} from "./GuiNode.ts";
import type {Window} from "../render/Window.ts";
import type {Consumer} from "../../type/types.ts";

/**
 * GUI 管理层:持有屏幕栈,统一驱动渲染循环、尺寸同步与 DOM 输入事件接入。
 *
 * 用法:
 *   const manager = new GuiManager(overlayCtx);
 *   manager.start(window);   // 接入 DOM 事件;尺寸由 Window 统一推送
 *   manager.push(new MyScreen());
 *
 * 与旧 render/ui 的区别:旧界面各自注册 window 监听并自建 rAF 循环;
 * 本管理器只接入一次 DOM,所有屏幕/控件共享同一事件分发与渲染通道,
 * 栈顶屏幕接收输入,栈内屏幕自底向上绘制。
 *
 * 渲染约定:
 *  - 画布由本层独占(叠加在世界画布之上):需要重绘时清空整层再按栈序绘制,
 *    不与下层内容混用;
 *  - 循环按需运行:屏幕栈为空并清空整层后自动停表,不空转;
 *  - 帧率上限约 60fps,且所有屏幕均无脏标记时跳过绘制;
 *  - 指针仅在屏幕栈非空时接管画布,其余时间穿透给下层。
 */
export class GuiManager {
    // 帧间隔下限
    private static readonly FRAME_INTERVAL = 1000 / 30;

    private readonly canvas: HTMLCanvasElement;
    private readonly ctx: CanvasRenderingContext2D;

    private readonly screens: GuiScreen[] = [];

    private width = 0;
    private height = 0;

    private running = false;
    private ctrl: AbortController | null = null;
    private unsubResize: Consumer<void> | null = null;
    private raf = 0;
    private lastTs = 0;
    private elapsed = 0;

    /** 本层需要重绘(屏幕增删 / 尺寸变化等结构性变化) */
    private layerDirty = false;

    /** 当前捕获指针的控件(按下时锁定,移动/抬起持续送达) */
    private active: GuiNode | null = null;

    public constructor(ctx: CanvasRenderingContext2D) {
        this.canvas = ctx.canvas;
        this.ctx = ctx;
        this.frame = this.frame.bind(this);
        this.setViewSize = this.setViewSize.bind(this);
    }

    public top(): GuiScreen | null {
        return this.screens.length > 0 ? this.screens[this.screens.length - 1] : null;
    }

    public push(screen: GuiScreen): GuiScreen {
        if (screen.manager === this || this.screens.includes(screen)) return screen;

        screen.manager = this;
        screen.setScreenSize(this.width, this.height);

        this.screens.push(screen);
        screen.notifyOpened();

        this.layerDirty = true;
        this.syncInteractivity();
        this.wake();
        return screen;
    }

    public popTop(): GuiScreen | null {
        const screen = this.screens.pop();
        if (!screen) return null;

        this.release();
        screen.manager = null;
        screen.notifyClosed();

        this.layerDirty = true;
        this.syncInteractivity();
        return screen;
    }

    public pop(screen: GuiScreen): boolean {
        const index = this.screens.indexOf(screen);
        if (index < 0) return false;

        this.screens.splice(index, 1);
        this.release();

        screen.manager = null;
        screen.notifyClosed();

        this.layerDirty = true;
        this.syncInteractivity();
        return true;
    }

    public clear(): void {
        while (this.popTop()) {
        }
    }

    public start(win: Window): void {
        if (this.running) return;
        this.running = true;

        this.ctrl = new AbortController();
        this.registryEvents();
        this.unsubResize = win.onResize(this.setViewSize);

        this.syncInteractivity();
        this.wake();
    }

    public stop(): void {
        if (!this.running) return;
        this.running = false;

        this.ctrl?.abort();
        this.ctrl = null;
        this.unsubResize?.();
        this.unsubResize = null;

        cancelAnimationFrame(this.raf);
        this.raf = 0;
        this.active = null;
        this.syncInteractivity();
    }

    /** 设置视口尺寸(画布 CSS 像素):由宿主(Window)在尺寸变化时推送 */
    public setViewSize(width: number, height: number): void {
        const nextWidth = Math.max(0, width);
        const nextHeight = Math.max(0, height);
        if (nextWidth === this.width && nextHeight === this.height) return;

        this.width = nextWidth;
        this.height = nextHeight;
        for (const screen of this.screens) {
            screen.setScreenSize(nextWidth, nextHeight);
        }
        this.layerDirty = true;
    }

    private syncInteractivity(): void {
        const interactive = this.running && this.screens.length > 0;
        this.canvas.classList.toggle('show', interactive);
    }

    private release(): void {
        this.active?.pointerCancel();
        this.active = null;
        for (const screen of this.screens) {
            screen.clearHover();
        }
    }

    private wake(): void {
        if (!this.running || this.raf !== 0 || this.screens.length === 0) return;

        this.lastTs = 0;
        this.elapsed = GuiManager.FRAME_INTERVAL;
        this.raf = requestAnimationFrame(this.frame);
    }

    private frame(ts: number): void {
        if (!this.running) {
            this.raf = 0;
            return;
        }

        if (this.screens.length === 0 && !this.layerDirty) {
            this.raf = 0;
            return;
        }

        this.raf = requestAnimationFrame(this.frame);

        const delta = this.lastTs === 0 ? 0 : ts - this.lastTs;
        this.lastTs = ts;
        this.elapsed += delta;

        // 限帧:余量累积保留(+1ms 容差),避免与显示器刷新率产生相位抖动
        if (this.elapsed + 1 < GuiManager.FRAME_INTERVAL) return;

        const dt = Math.min(50, this.elapsed);
        this.elapsed = Math.max(0, this.elapsed - GuiManager.FRAME_INTERVAL);
        this.advance(dt);
    }

    /** 推进一帧:先驱动全部可见屏幕,再判断是否需要整层重绘 */
    private advance(dt: number): void {
        let dirty = this.layerDirty;
        for (const screen of this.screens) {
            if (screen.visible) screen.tick(dt);
            if (screen.paintDirty) dirty = true;
        }
        if (dirty) this.commit();
    }

    /** 整层重绘:清空本层后按栈序绘制全部屏幕 */
    private commit(): void {
        this.layerDirty = false;
        this.ctx.clearRect(0, 0, this.width, this.height);
        for (const screen of this.screens) {
            screen.render(this.ctx);
        }
    }

    private registryEvents(): void {
        const signal = this.ctrl!.signal;
        const canvas = this.canvas;

        canvas.addEventListener('pointerdown', event => {
            if (event.button !== 0) return;
            this.dispatchPointerDown(event);
        }, {signal});

        canvas.addEventListener('pointermove', event => {
            const top = this.top();
            if (!top) return;

            if (this.active) {
                this.active.pointerMove(event);
                return;
            }
            // 悬停目标即命中控件,直接分发指针移动
            top.updateHover(event.offsetX, event.offsetY)?.pointerMove(event);
        }, {signal, passive: true});

        canvas.addEventListener('pointerup', event => {
            if (event.button !== 0) return;

            this.releaseCapture(event.pointerId);
            const active = this.active;
            this.active = null;
            active?.pointerUp(event);
        }, {signal});

        canvas.addEventListener('pointercancel', event => {
            this.releaseCapture(event.pointerId);
            const active = this.active;
            this.active = null;
            active?.pointerCancel();
        }, {signal});

        // 指针移出画布:清除悬停高亮(拖拽期间由捕获与 active 接管)
        canvas.addEventListener('pointerleave', () => {
            if (this.active) return;
            this.top()?.clearHover();
        }, {signal});

        canvas.addEventListener('wheel', event => {
            this.top()?.wheel(event);
        }, {signal, passive: true});

        // 键盘:路由给栈顶屏幕的焦点控件,再回落屏幕默认行为
        window.addEventListener('keydown', event => {
            const top = this.top();
            if (!top) return;
            let handled = false;

            const focus = top.getFocused();
            if (focus && focus.visible && focus.enabled) {
                handled = focus.keyDown(event);
            }

            if (!handled &&
                !event.ctrlKey &&
                !event.metaKey &&
                !event.altKey &&
                event.key.length === 1
            ) {
                handled = focus?.insertChar(event.key) ?? false;
            }

            if (!handled) {
                handled = top.keyDown(event);
            }

            if (handled) event.preventDefault();
        }, {signal});
    }

    private dispatchPointerDown(pointer: PointerEvent): void {
        const top = this.top();
        if (!top) return;

        const active = top.pointerDown(pointer);
        this.active = active;
        if (active === null) return;

        // 由控件消费的按下:捕获指针,保证拖出画布后仍能收到 move/up
        this.canvas.setPointerCapture(pointer.pointerId);
        if (active.focusable) {
            top.setFocus(active);
        }
    }

    /** 释放指针捕获(仅在仍持有捕获时) */
    private releaseCapture(pointerId: number): void {
        if (this.canvas.hasPointerCapture(pointerId)) {
            this.canvas.releasePointerCapture(pointerId);
        }
    }
}
