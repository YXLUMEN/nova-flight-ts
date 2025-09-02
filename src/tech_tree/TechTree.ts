import {TechState} from "./TechState.ts";
import type {Tech} from "../apis/ITech.ts";
import {World} from "../world/World.ts";
import {applyTech} from "./apply_tech.ts";
import {clamp} from "../utils/math/math.ts";
import {WorldConfig} from "../configs/WorldConfig.ts";
import {Cannon40Weapon} from "../weapon/Cannon40Weapon.ts";
import {BombWeapon} from "../weapon/BombWeapon.ts";
import {EVENTS} from "../apis/IEvents.ts";

type Adjacency = {
    out: Map<string, string[]>; // id -> successors
    conflicts: Map<string, string[]>; // id -> conflicts
    branchOf: Map<string, string | undefined>; // id -> branchGroup
    branchMembers: Map<string, string[]>; // branchGroup -> ids
};

export class TechTree {
    public static readonly playerScore = document.getElementById('player-money')!;

    private static readonly submitBtn = document.getElementById('d-unlock') as HTMLButtonElement;
    private static readonly resetBtn = document.getElementById('reset') as HTMLButtonElement;
    private static readonly techTitle = document.getElementById('d-title')!;
    private static readonly metaShow = document.getElementById('d-meta')!;
    private static readonly nodeWidth = 144;
    private static readonly nodeHeight = 40;

    private readonly container: HTMLElement;
    private readonly svg: SVGSVGElement;
    private readonly nodesLayer: HTMLElement;
    private readonly state: TechState;
    private readonly adj: Adjacency;
    private readonly abortCtrl: AbortController = new AbortController();

    private selectNodeId: string | null = null;

    public constructor(container: HTMLElement, techs: Tech[]) {
        this.container = container;

        const techState = TechState.normalizeTechs(techs);
        this.state = new TechState(techState);
        this.adj = this.buildAdjacency(techState);

        this.tryApply = this.tryApply.bind(this);
        this.resetTech = this.resetTech.bind(this);

        container.textContent = '';
        const svgNS = 'http://www.w3.org/2000/svg';
        this.svg = document.createElementNS(svgNS, 'svg');
        this.svg.classList.add('edges');
        this.nodesLayer = document.createElement('div');
        this.nodesLayer.classList.add('nodes');
        container.append(this.svg, this.nodesLayer);

        this.renderEdges();
        this.renderNodes();
        this.bindInteractions();
    }

    private static linkTo(from: Tech, to: Tech) {
        const fx = from.x + TechTree.nodeWidth / 2;
        const fy = from.y + TechTree.nodeHeight / 2;
        const tx = to.x + TechTree.nodeWidth / 2;
        const ty = to.y + TechTree.nodeHeight / 2;

        const dx = tx - fx;

        let x1: number, y1: number, x2: number, y2: number;

        if (dx >= 0) {
            // from -> 右边缘, to -> 左边缘
            x1 = from.x + TechTree.nodeWidth;
            y1 = fy;
            x2 = to.x;
            y2 = ty;
        } else {
            // from -> 左边缘, to -> 右边缘
            x1 = from.x;
            y1 = fy;
            x2 = to.x + TechTree.nodeWidth;
            y2 = ty;
        }

        return {x1, y1, x2, y2};
    }

    private static setupPanZoom(container: HTMLElement, abortCtrl: AbortController): void {
        const parent = container.parentElement as HTMLElement;
        if (!parent) return;

        let panX = 0, panY = 0, scale = 1;
        let isDragging = false, lastX = 0, lastY = 0;

        const dragStop = () => isDragging = false;

        parent.addEventListener('pointerdown', e => {
            isDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
        }, {signal: abortCtrl.signal});
        parent.addEventListener('pointerup', dragStop, {signal: abortCtrl.signal});
        parent.addEventListener('pointermove', e => {
            if (!isDragging) return;
            panX += e.clientX - lastX;
            panY += e.clientY - lastY;
            lastX = e.clientX;
            lastY = e.clientY;
            applyTransform();
        }, {signal: abortCtrl.signal});
        parent.addEventListener('pointerout', dragStop, {signal: abortCtrl.signal});
        parent.addEventListener('blur', dragStop, {signal: abortCtrl.signal});
        parent.addEventListener('wheel', e => {
            scale = clamp(scale * Math.pow(1.1, -e.deltaY / 100), 0.5, 2);
            applyTransform();
        }, {passive: true, signal: abortCtrl.signal});

        const applyTransform = () =>
            container.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    }

    public destroy() {
        this.container.replaceChildren();
        this.abortCtrl.abort();
        TechTree.playerScore.textContent = '0';
    }

    // -------- Incremental updates --------
    public applyUnlockUpdates(id: string) {
        const affected = new Set<string>();

        const add = (ids: Iterable<string>) => {
            for (const x of ids) affected.add(x);
        };

        // 自身 + 自身后继
        affected.add(id);
        add(this.successorsClosure(id));

        // 分支互斥节点 + 它们的后继
        const branchPeers = this.branchPeers(id);
        add(branchPeers);
        for (const p of branchPeers) add(this.successorsClosure(p));

        // 冲突节点 + 它们的后继
        const conflictPeers = this.conflictPeers(id);
        add(conflictPeers);
        for (const p of conflictPeers) add(this.successorsClosure(p));

        // 更新节点
        for (const nid of affected) this.updateNodeClass(nid);

        // 更新相关边
        this.updateEdgesAround(Array.from(affected));
    }

    public getTech(id: string): Tech | undefined {
        const tech = this.state.getTech(id);
        if (tech === undefined) return undefined;
        return {...tech};
    }

    public isUnlocked(id: string): boolean {
        return this.state.isUnlocked(id);
    }

    public unlockAll(world: World) {
        const all = Array.from(this.state.techById.keys());
        for (const nid of all) {
            if (this.state.isUnlocked(nid)) continue;

            this.state.forceUnlock(nid);
            this.updateNodeClass(nid);
            applyTech(world, nid);
        }
        this.updateEdgesAround(all);
    }

    public getSelected() {
        return this.selectNodeId;
    }

    // -------- Rendering --------
    private renderEdges() {
        const svgNS = 'http://www.w3.org/2000/svg';
        this.svg.textContent = '';

        this.state.techById.forEach(t => {
            (t.requires || []).forEach(req => {
                const from = this.state.techById.get(req);
                if (!from) return;
                const line = document.createElementNS(svgNS, 'line');
                line.dataset.from = from.id;
                line.dataset.to = t.id;

                const {x1, y1, x2, y2} = TechTree.linkTo(from, t);

                line.setAttribute('x1', `${x1}`);
                line.setAttribute('y1', `${y1}`);
                line.setAttribute('x2', `${x2}`);
                line.setAttribute('y2', `${y2}`);
                line.classList.add('edge');
                this.svg.appendChild(line);
            });
        });

        this.updateAllEdgeClasses();
    }

    private renderNodes() {
        const frag = document.createDocumentFragment();
        this.state.techById.forEach(t => {
            frag.append(this.createNodeElement(t));
        });
        this.nodesLayer.replaceChildren(frag);
    }

    private createNodeElement(t: Tech): HTMLElement {
        const el = document.createElement('div');
        el.dataset.id = t.id;
        el.className = `node ${this.state.computeStatus(t.id)}`;
        el.style.left = `${t.x}px`;
        el.style.top = `${t.y}px`;
        el.textContent = t.name;
        return el;
    }

    // -------- Interactions --------
    private bindInteractions() {
        this.nodesLayer.addEventListener('click', event => {
            this.nodesLayer.querySelector('.node.selected')?.classList.remove('selected');
            const target = (event.target as HTMLElement).closest<HTMLElement>('.node');
            this.selectNodeId = null;

            if (!target) {
                this.onSelect(null);
                return;
            }

            target.classList.add('selected');
            const id = target.dataset.id!;
            this.selectNodeId = id;
            this.onSelect(id);
        }, {signal: this.abortCtrl.signal});

        this.nodesLayer.addEventListener('dblclick', this.tryApply, {signal: this.abortCtrl.signal});
        TechTree.submitBtn.addEventListener('click', this.tryApply, {signal: this.abortCtrl.signal});
        TechTree.resetBtn.addEventListener('click', this.resetTech, {signal: this.abortCtrl.signal});

        TechTree.setupPanZoom(this.container, this.abortCtrl);
    }

    private tryApply() {
        const id = this.selectNodeId;
        if (!id) return;
        const cost = this.state.getTech(id)?.cost;
        if (cost === undefined) return;

        const player = World.instance.player;
        const score = player.getScore() - cost;
        if (score < 0 && !WorldConfig.devMode) return;

        if (this.state.unlock(id)) {
            player.setScore(score);
            this.applyUnlockUpdates(id);
            World.instance.events.emit(EVENTS.UNLOCK_TECH, {id});
        }
    }

    private onSelect(id: string | null) {
        TechTree.submitBtn.disabled = !id;
        if (!id) {
            this.selectNodeId = null;
            TechTree.techTitle.textContent = '';
            TechTree.metaShow.textContent = '';
            return;
        }

        const tech = this.state.getTech(id);
        if (!tech) return;
        const {desc, cost, requires} = tech;

        const frag = document.createDocumentFragment();

        const descDiv = document.createElement('div');
        descDiv.textContent = desc ?? '';
        descDiv.className = 'desc';
        frag.append(descDiv);

        const costDiv = document.createElement('div');
        costDiv.textContent = cost === undefined ? '无法使用' : `花费: ${cost}`;
        frag.append(costDiv);

        if (requires && requires.length) {
            const names = requires
                .map(id => this.state.getTech(id))
                .filter(tech => tech !== undefined)
                .map(tech => tech.name)
                .join(', ');
            const requireDiv = document.createElement('div');
            requireDiv.className = 'require';
            requireDiv.textContent = `前置科技: ${names}`;
            frag.append(requireDiv);
        }

        // 冲突
        const declaredConflicts = tech.conflicts ?? [];
        const branchConflictIds = this.branchPeers(id);
        if (declaredConflicts.length > 0 || branchConflictIds.length > 0) {
            const allConflictIds = new Set([...declaredConflicts, ...branchConflictIds]);
            const names = allConflictIds
                .values()
                .map(id => this.state.getTech(id))
                .filter(tech => tech !== undefined)
                .map(tech => tech.name)
                .toArray()
                .join(', ');

            const conflictDiv = document.createElement('div');
            conflictDiv.className = 'conflict';
            conflictDiv.textContent = `冲突科技: ${names}`;
            frag.append(conflictDiv);
        }

        TechTree.techTitle.textContent = tech.name;
        TechTree.metaShow.replaceChildren(frag);
    }

    private updateNodeClass(id: string) {
        const el = this.nodesLayer.querySelector<HTMLElement>(`.node[data-id="${CSS.escape(id)}"]`);
        if (!el) return;

        el.classList.remove('unlocked', 'unlockable', 'locked', 'conflicted');
        el.classList.add(this.state.computeStatus(id));
    }

    private updateEdgesAround(ids: string[]) {
        const selector = ids
            .map(id => `[data-from="${CSS.escape(id)}"],[data-to="${CSS.escape(id)}"]`)
            .join(',');
        const edges = this.svg.querySelectorAll<SVGLineElement>(selector);
        edges.forEach(line => this.updateEdgeClass(line));
    }

    private updateAllEdgeClasses() {
        const edges = this.svg.querySelectorAll<SVGLineElement>('.edge');
        edges.forEach(line => this.updateEdgeClass(line));
    }

    private updateEdgeClass(line: SVGLineElement) {
        const from = line.dataset.from!;
        const to = line.dataset.to!;
        const fromUnlocked = this.state.isUnlocked(from);
        const toUnlocked = this.state.isUnlocked(to);
        const toStatus = this.state.computeStatus(to);

        line.classList.toggle('active', fromUnlocked && toUnlocked);
        line.classList.toggle('available', fromUnlocked && toStatus === 'unlockable');
        line.classList.toggle('blocked', toStatus === 'conflicted' || toStatus === 'locked');
    }

    // -------- Adjacency helpers --------
    private buildAdjacency(techs: Tech[]): Adjacency {
        const out = new Map<string, string[]>();
        const conflicts = new Map<string, string[]>();
        const branchOf = new Map<string, string | undefined>();
        const branchMembers = new Map<string, string[]>();

        for (const t of techs) {
            for (const r of t.requires || []) {
                if (!out.has(r)) out.set(r, []);
                out.get(r)!.push(t.id);
            }
            if (t.conflicts && t.conflicts.length) conflicts.set(t.id, t.conflicts);

            branchOf.set(t.id, t.branchGroup);
            if (t.branchGroup) {
                if (!branchMembers.has(t.branchGroup)) branchMembers.set(t.branchGroup, []);
                branchMembers.get(t.branchGroup)!.push(t.id);
            }
        }
        return {out, conflicts, branchOf, branchMembers};
    }

    private successorsClosure(id: string): string[] {
        const res: string[] = [];
        const seen = new Set<string>();
        const stack = [...(this.adj.out.get(id) || [])];
        while (stack.length) {
            const n = stack.pop()!;
            if (seen.has(n)) continue;
            seen.add(n);
            res.push(n);
            const next = this.adj.out.get(n);
            if (next) stack.push(...next);
        }
        return res;
    }

    private branchPeers(id: string): string[] {
        const group = this.adj.branchOf.get(id);
        if (!group) return [];
        return (this.adj.branchMembers.get(group) || []).filter(x => x !== id);
    }

    private conflictPeers(id: string): string[] {
        return this.adj.conflicts.get(id) || [];
    }

    private resetTech() {
        const allTech = this.state.techById;
        const unlocked: Tech[] = [];
        for (const [nid, tech] of allTech) {
            if (this.state.isUnlocked(nid)) unlocked.push(tech);
        }
        if (unlocked.length === 0) return;

        const player = World.instance.player;
        let backScore = 0;
        for (const tech of unlocked) {
            const cost = tech.cost;
            if (cost) backScore += cost;
        }
        player.setScore(player.getScore() + (backScore * 0.8) | 0);
        player.currentBaseIndex = 0;
        player.baseWeapons.length = 0;
        player.weapons.clear();

        player.baseWeapons.push(new Cannon40Weapon(player));
        player.weapons.set('40', player.baseWeapons[0]);
        player.weapons.set('bomb', new BombWeapon(player));

        this.state.reset();
        this.renderNodes();
    }
}
