import type {ClientTech} from "./ClientTech.ts";
import type {TechState} from "../../world/tech/TechState.ts";
import type {TextElement} from "../page/TextElement.ts";
import {as, assert} from "../../utils/dom_util.ts";
import {clamp} from "../../utils/math/math.ts";
import {AnsiParser} from "../../utils/AnsiParser.ts";
import {NovaFlightClient} from "../NovaFlightClient.ts";
import {SoundEvents} from "../../sound/SoundEvents.ts";
import {ModelManager} from "../render/model/ModelManager.ts";

export class TechTreeCanvas {
    private readonly container: HTMLElement;
    private readonly metaShow: HTMLElement;

    private readonly techTitle: HTMLElement;
    private readonly techStatus: TextElement;
    private readonly techTexture: HTMLImageElement;

    private readonly svg: SVGSVGElement;
    private readonly nodesLayer: HTMLElement;

    private readonly nodeWidth = 144;
    private readonly nodeHeight = 40;

    private readonly state: TechState<ClientTech>;

    public constructor(
        root: HTMLElement,
        state: TechState<ClientTech>,
        signal: AbortSignal,
        techStatus: TextElement,
    ) {
        this.container = assert(root, '#viewport');
        this.metaShow = assert(root, '#d-meta');

        this.techStatus = techStatus;
        this.techTitle = assert(root, '#d-title');
        this.techTexture = as(root, '#d-texture', HTMLImageElement);

        this.state = state;
        this.container.replaceChildren();
        const svgNS = 'http://www.w3.org/2000/svg';

        this.svg = document.createElementNS(svgNS, 'svg');
        this.svg.classList.add('edges');

        this.nodesLayer = document.createElement('div');
        this.nodesLayer.classList.add('nodes');
        this.container.append(this.svg, this.nodesLayer);

        this.bindListener(signal);
    }

    public destroy() {
        this.container.replaceChildren();
        this.svg.remove();
        this.nodesLayer.remove();
    }

    public refreshNodes() {
        this.updateAllEdgeClasses();
        this.renderNodes();
    }

    public renderSelect(id: string | null, tech: ClientTech | null) {
        this.nodesLayer.querySelector('.node.selected')?.classList.remove('selected');
        this.metaShow.replaceChildren();

        if (!id || !tech) {
            this.techTexture.classList.add('hidden');
            this.techTexture.removeAttribute('src');
            this.techTexture.alt = '';

            this.techTitle.textContent = '';
            this.techStatus.setText('');
            return;
        }

        this.nodesLayer
            .querySelector<HTMLElement>(`.node[data-id="${CSS.escape(id)}"]`)
            ?.classList.add('selected');

        const {desc, cost, requires} = tech;

        const frag = document.createDocumentFragment();
        const descDiv = document.createElement('div');
        descDiv.appendChild(AnsiParser.parseToElement(desc.toString()));
        descDiv.className = 'desc';
        frag.appendChild(descDiv);

        frag.appendChild(this.createStatusRow('研究点数', cost === -1 ? '不可用' : String(cost), 'cost'));

        if (requires && requires.size > 0) {
            const names = requires
                .values()
                .map(tech => tech.name.toString())
                .toArray()
                .join(' / ');

            frag.appendChild(this.createStatusRow('前置科技', names, 'requires'));
        }

        // 冲突
        const declaredConflicts = tech.conflicts;
        const branchConflicts = this.state.branchPeers(tech);
        const allConflicts = new Set([...declaredConflicts ?? [], ...branchConflicts ?? []]);

        if (allConflicts.size > 0) {
            const names = allConflicts
                .values()
                .map(tech => tech.name.toString())
                .toArray()
                .join(' / ');

            frag.appendChild(this.createStatusRow('冲突科技', names, 'conflicts'));
        }

        const status = this.state.computeStatus(tech);
        this.techStatus.setText(STATUS_TEXT[status]);

        const name = tech.name.toString();
        const src = ModelManager.getTechModel(tech).getCovered();
        this.techTexture.classList.remove('hidden');
        this.techTexture.src = src;
        this.techTexture.alt = name;
        this.techTitle.textContent = name;

        this.metaShow.replaceChildren(frag);
    }

    public onApply(tech: ClientTech) {
        const affected = this.state.affectedByUnlock(tech);

        // 更新相关边
        this.updateEdgesAround(affected
            .values()
            .map(tech => {
                // 更新节点
                this.updateNodeClass(tech);
                return this.state.getTechId(tech);
            })
            .filter(id => id !== null)
            .map(id => id.toString())
        );
    }

    public renderNodes() {
        const frag = document.createDocumentFragment();
        for (const tech of this.state.allTechs) {
            frag.append(this.createNodeElement(tech));
        }
        this.nodesLayer.replaceChildren(frag);
    }

    public updateNodeClass(tech: ClientTech) {
        const id = this.state.getTechId(tech)?.toString();
        if (!id) return;
        const ele = this.nodesLayer.querySelector<HTMLElement>(`.node[data-id="${CSS.escape(id)}"]`);
        if (!ele) return;

        ele.classList.remove('unlocked', 'unlockable', 'locked', 'conflicted');
        ele.classList.add(this.state.computeStatus(tech));

        if (!this.state.isUnlocked(tech)) return;
        ele.classList.add('just-unlocked');
    }

    public renderEdges() {
        const svgNS = 'http://www.w3.org/2000/svg';
        const frag = document.createDocumentFragment();
        for (const to of this.state.allTechs) {
            const requires = to.requires as Set<ClientTech> | null;
            if (requires === null) continue;

            for (const from of requires) {
                if (to.drawExcept && to.drawExcept.has(from)) continue;

                const path = document.createElementNS(svgNS, 'path');
                path.dataset.from = this.state.getTechId(from)!.toString();
                path.dataset.to = this.state.getTechId(to)!.toString();
                path.setAttribute('d', this.edgePath(from, to));
                path.classList.add('edge');
                frag.appendChild(path);
            }
        }

        this.svg.replaceChildren(frag);
    }

    public updateEdgesAround(ids: IteratorObject<string>) {
        const selector = ids
            .map(id => `[data-from="${CSS.escape(id)}"],[data-to="${CSS.escape(id)}"]`)
            .toArray()
            .join(',');

        const edges = this.svg.querySelectorAll<SVGPathElement>(selector);
        for (const path of edges) {
            this.updateEdgeClass(path);
        }
    }

    private updateAllEdgeClasses() {
        const edges = this.svg.querySelectorAll<SVGPathElement>('.edge');
        for (const path of edges) {
            this.updateEdgeClass(path);
        }
    }

    private updateEdgeClass(path: SVGPathElement) {
        const from = this.state.getTech(path.dataset.from!)!;
        const to = this.state.getTech(path.dataset.to!)!;
        const fromUnlocked = this.state.isUnlocked(from);
        const toUnlocked = this.state.isUnlocked(to);
        const toStatus = this.state.computeStatus(to);

        path.classList.toggle('active', fromUnlocked && toUnlocked);
        path.classList.toggle('available', fromUnlocked && toStatus === 'unlockable');
        path.classList.toggle('conflict', toStatus === 'conflicted');
        path.classList.toggle('blocked', toStatus === 'locked');
    }

    private edgePath(from: ClientTech, to: ClientTech): string {
        const fx = from.x + this.nodeWidth / 2;
        const fy = from.y + this.nodeHeight / 2;
        const tx = to.x + this.nodeWidth / 2;
        const ty = to.y + this.nodeHeight / 2;
        const dx = tx - fx;

        // Same-column links run vertically through the row gap.
        if (Math.abs(dx) < this.nodeWidth * 0.6) {
            const x = Math.round(fx);
            const down = ty >= fy;
            const y1 = down ? from.y + this.nodeHeight : from.y;
            const y2 = down ? to.y : to.y + this.nodeHeight;
            const bend = Math.max(20, Math.abs(y2 - y1) * 0.45);
            const dir = down ? 1 : -1;
            return `M ${x} ${y1} C ${x} ${y1 + dir * bend}, ${x} ${y2 - dir * bend}, ${x} ${y2}`;
        }

        const x1 = dx >= 0 ? from.x + this.nodeWidth : from.x;
        const x2 = dx >= 0 ? to.x : to.x + this.nodeWidth;
        const bend = Math.max(30, Math.abs(x2 - x1) * 0.45);
        const dir = x2 >= x1 ? 1 : -1;
        return `M ${x1} ${fy} C ${x1 + dir * bend} ${fy}, ${x2 - dir * bend} ${ty}, ${x2} ${ty}`;
    }

    private createNodeElement(tech: ClientTech): HTMLElement {
        const div = document.createElement('div');
        const id = this.state.getTechId(tech)!;
        div.dataset.id = id.toString();

        div.className = `node ${this.state.computeStatus(tech)}`;
        div.style.left = `${tech.x}px`;
        div.style.top = `${tech.y}px`;

        const name = tech.name.toString();
        div.textContent = name;
        div.title = name;

        if (tech.branchGroup) {
            div.dataset.branch = tech.branchGroup;
            const mark = document.createElement('span');
            mark.className = 'node-branch';
            mark.inert = true;
            mark.style.setProperty('--branch', tech.branchColor);
            div.append(mark);
        }

        return div;
    }

    private createStatusRow(label: string, value: string, className: string) {
        const row = document.createElement('div');
        row.className = `meta-row ${className}`;

        const labelEl = document.createElement('span');
        labelEl.className = 'meta-label';
        labelEl.textContent = label;

        const valueEl = document.createElement('span');
        valueEl.className = 'meta-value';
        valueEl.textContent = value;

        row.append(labelEl, valueEl);
        return row;
    }

    private bindListener(signal: AbortSignal) {
        this.techTexture.addEventListener('error', () => {
            if (this.techTexture.src === '/texture/default.png') return;
            this.techTexture.src = '/texture/default.png';
        }, {signal});

        // 拖拽缩放
        const parent = this.container.parentElement as HTMLElement;
        if (!parent) return;

        let panX = 0, panY = 0, scale = 1;
        let isDragging = false, lastX = 0, lastY = 0;

        const dragStop = () => isDragging = false;

        parent.addEventListener('pointerdown', e => {
            isDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
            if (e.button === 1) {
                panX = panY = 0;
                applyTransform();
            }
        }, {signal});
        parent.addEventListener('pointerup', dragStop, {signal});
        parent.addEventListener('pointermove', e => {
            if (!isDragging) return;
            panX += e.clientX - lastX;
            panY += e.clientY - lastY;
            lastX = e.clientX;
            lastY = e.clientY;
            applyTransform();
        }, {signal});
        parent.addEventListener('pointerout', dragStop, {signal});
        parent.addEventListener('blur', dragStop, {signal});
        parent.addEventListener('wheel', e => {
            scale = clamp(scale * Math.pow(1.1, -e.deltaY / 100), 0.5, 2);
            applyTransform();
            NovaFlightClient.instance().globalSound.playSound(SoundEvents.UI_HOVER);
        }, {passive: true, signal});

        const applyTransform = () => {
            this.container.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
        }
    }
}

const STATUS_TEXT = {
    unlocked: 'tech-tree.legend.active',
    unlockable: 'tech-tree.legend.ready',
    locked: 'tech-tree.legend.locked',
    conflicted: 'tech-tree.legend.conflict',
} as const;