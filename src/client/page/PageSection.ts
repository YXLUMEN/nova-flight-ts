import type {GuiManager} from "./GuiManager.ts";

export abstract class PageSection {
    // 由管理器设置
    public manager: GuiManager | null = null;

    protected readonly root: HTMLElement;
    protected closeOnEscape = false;

    private readonly reusable: boolean;
    private destroyed = false;

    protected constructor(page: HTMLElement | string, reusable: boolean = true) {
        const root = typeof page === 'string' ?
            document.getElementById(page)! :
            page;

        if (root === null || !root.classList.contains('c-section')) {
            throw new DOMException('The page root doesn\'t contain ".c-section"');
        }
        this.root = root;
        this.reusable = reusable;
    }

    public isShow(): boolean {
        return !this.root.classList.contains('hidden');
    }

    public close(): void {
        this.manager?.close(this);
    }

    /** @readonly */
    public destroy(): void {
        if (this.destroyed) return;
        this.destroyed = true;

        this.close();
        this.onDestroy();
    }

    public keyDown(event: KeyboardEvent): boolean {
        if (event.code === 'Escape' && this.closeOnEscape) {
            this.close();
            return true;
        }
        return false;
    }

    protected onOpened(): void {
    }

    protected onClosed(): void {
    }

    protected onDestroy(): void {
    }

    // 内部方法

    /**
     * @readonly
     * @inner
     * 由管理器在 push / pop 时调用
     * */
    public notifyOpened(): void {
        this.root.classList.remove('hidden');
        this.root.focus();
        this.onOpened();
    }

    /**
     * @readonly
     * @inner
     * 由管理器在 pop 时调用(保证只回调一次)
     * */
    public notifyClosed(): void {
        this.root.classList.add('hidden');
        this.onClosed();
        if (!this.reusable) this.destroy();
    }

    /**
     * @readonly
     * @inner
     * 层级.由管理器调用
     * */
    public index(i: number) {
        this.root.style.zIndex = String(i);
    }
}