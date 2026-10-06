import type {PageSection} from "./PageSection.ts";

export class GuiManager {
    private readonly root: HTMLElement;
    private readonly sections: PageSection[] = [];

    public constructor(root: HTMLElement) {
        this.root = root;

        window.addEventListener('keydown', event => {
            const top = this.top();
            if (top && top.keyDown(event)) event.preventDefault();
        });
    }

    public top(): PageSection | null {
        return this.sections.length > 0 ? this.sections[this.sections.length - 1] : null;
    }

    public open(section: PageSection): PageSection {
        if (this.sections.includes(section)) return section;

        this.root.classList.remove('hidden');
        section.manager = this;

        this.sections.push(section);
        this.refresh();
        section.notifyOpened();
        return section;
    }

    public pop(): PageSection | null {
        const section = this.sections.pop();
        if (!section) return null;

        this.refresh();
        section.manager = null;
        section.notifyClosed();
        return section;
    }

    public close(section: PageSection): boolean {
        const index = this.sections.indexOf(section);
        if (index < 0) return false;

        while (this.sections.length > index) {
            const top = this.sections.pop()!;
            top.manager = null;
            top.notifyClosed();
        }
        this.refresh();
        return true;
    }

    public closeAll() {
        while (this.pop()) {
        }
    }

    public destroyAll() {
        while (true) {
            const section = this.pop();
            if (!section) break;
            section.destroy();
        }
    }

    private refresh() {
        if (this.sections.length === 0) {
            this.root.classList.add('hidden');
            return;
        }

        for (let i = 0; i < this.sections.length; i++) {
            this.sections[i].index(i);
        }
    }
}