import {TechState} from "../../tech/TechState.ts";
import {clamp} from "../../utils/math/math.ts";
import {EVENTS} from "../../apis/IEvents.ts";
import {Items} from "../../item/Items.ts";
import {SoundEvents} from "../../sound/SoundEvents.ts";
import {type NbtCompound} from "../../nbt/NbtCompound.ts";
import {SoundSystem} from "../../sound/SoundSystem.ts";
import type {TechTree} from "../../tech/TechTree.ts";
import type {ClientPlayerEntity} from "../entity/ClientPlayerEntity.ts";
import {PlayerTechResetC2SPacket} from "../../network/packet/c2s/PlayerTechResetC2SPacket.ts";
import {applyClientTech} from "./applyClientTech.ts";
import {Registries} from "../../registry/Registries.ts";
import type {Tech} from "../../tech/Tech.ts";
import type {RegistryEntry} from "../../registry/tag/RegistryEntry.ts";

type Adjacency = {
    successors: Map<Tech, Tech[]>; // tech -> successors
    conflicts: Map<Tech, Tech[]>; // tech -> conflicts
    branchGroupOf: Map<Tech, string | null>; // tech -> branchGroup
    techsInBranch: Map<string, Tech[]>; // branchGroup -> Techs
};


export class ClientTechTree implements TechTree {
    public readonly playerScore = document.getElementById('player-money')!;

    private readonly submitBtn = document.getElementById('d-unlock') as HTMLButtonElement;
    private readonly resetBtn = document.getElementById('reset') as HTMLButtonElement;
    private readonly techTitle = document.getElementById('d-title')!;
    private readonly metaShow = document.getElementById('d-meta')!;
    private readonly nodeWidth = 144;
    private readonly nodeHeight = 40;

    private readonly player: ClientPlayerEntity;
    private readonly container: HTMLElement;
    private readonly svg: SVGSVGElement;
    private readonly nodesLayer: HTMLElement;
    private readonly state: TechState;
    private readonly adj: Adjacency;
    private readonly abortCtrl: AbortController = new AbortController();

    private selectNodeId: string | null = null;

    public constructor(player: ClientPlayerEntity, container: HTMLElement) {
        this.player = player;
        this.container = container;

        const techState = Registries.TECH
            .getEntries()
            .map(entry => entry.getValue())
            .toArray();
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

    public applyUnlockUpdates(tech: Tech) {
        const affected = new Set<Tech>();

        const add = (ids: Iterable<Tech>) => {
            for (const x of ids) affected.add(x);
        };

        // 自身 + 自身后继
        affected.add(tech);
        add(this.successorsClosure(tech));

        // 分支互斥节点 + 它们的后继
        const branchPeers = this.branchPeers(tech);
        add(branchPeers);
        for (const p of branchPeers) add(this.successorsClosure(p));

        // 冲突节点 + 它们的后继
        const conflictPeers = this.conflictPeers(tech);
        add(conflictPeers);
        for (const p of conflictPeers) add(this.successorsClosure(p));

        // 更新节点
        for (const t of affected) this.updateNodeClass(t);

        // 更新相关边
        this.updateEdgesAround(affected
            .values()
            .map(tech => this.state.getTechId(tech))
            .filter(id => id !== null)
            .map(id => id.toString())
            .toArray()
        );
    }

    public unlock(tech: RegistryEntry<Tech>): boolean {
        return this.state.unlock(tech.getValue());
    }

    public forceUnlock(tech: RegistryEntry<Tech>): void {
        this.state.forceUnlock(tech.getValue());
    }

    public isUnlocked(tech: RegistryEntry<Tech>): boolean {
        return this.state.isUnlocked(tech.getValue());
    }

    public unlockAll() {
        const allTech = this.state.allTechs;
        for (const tech of allTech) {
            if (this.state.isUnlocked(tech)) continue;

            this.state.forceUnlock(tech);
            this.updateNodeClass(tech);
            const entry = Registries.TECH.getEntryByValue(tech);
            if (!entry) throw new Error(`Unbound value ${tech}`);
            applyClientTech(entry);
        }
        this.updateEdgesAround(allTech.values()
            .map(tech => this.state.getTechId(tech))
            .filter(tech => tech !== null)
            .map(id => id.toString())
            .toArray()
        );
    }

    public getSelected() {
        return this.selectNodeId;
    }

    public destroy() {
        this.adj.successors.clear();
        this.adj.techsInBranch.clear();
        this.adj.branchGroupOf.clear();
        this.adj.conflicts.clear();
        this.state.clear();

        this.container.replaceChildren();
        this.abortCtrl.abort();
        this.playerScore.textContent = '0';
    }

    private linkTo(from: Tech, to: Tech) {
        const fx = from.x + this.nodeWidth / 2;
        const fy = from.y + this.nodeHeight / 2;
        const tx = to.x + this.nodeWidth / 2;
        const ty = to.y + this.nodeHeight / 2;

        const dx = tx - fx;

        let x1: number, y1: number, x2: number, y2: number;

        if (dx >= 0) {
            // from -> 右边缘, to -> 左边缘
            x1 = from.x + this.nodeWidth;
            y1 = fy;
            x2 = to.x;
            y2 = ty;
        } else {
            // from -> 左边缘, to -> 右边缘
            x1 = from.x;
            y1 = fy;
            x2 = to.x + this.nodeWidth;
            y2 = ty;
        }

        return {x1, y1, x2, y2};
    }

    private setupPanZoom(container: HTMLElement, abortCtrl: AbortController): void {
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
            SoundSystem.globalSound.playSound(SoundEvents.UI_HOVER);
        }, {passive: true, signal: abortCtrl.signal});

        const applyTransform = () =>
            container.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    }

    // -------- Rendering --------
    private renderEdges() {
        const svgNS = 'http://www.w3.org/2000/svg';
        this.svg.textContent = '';

        this.state.allTechs.forEach(to => {
            if (to.requires === null) return;

            to.requires.forEach(from => {
                const line = document.createElementNS(svgNS, 'line');
                line.dataset.from = this.state.getTechId(from)!.toString();
                line.dataset.to = this.state.getTechId(to)!.toString();

                const {x1, y1, x2, y2} = this.linkTo(from, to);

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
        this.state.allTechs.forEach(tech => {
            frag.append(this.createNodeElement(tech));
        });
        this.nodesLayer.replaceChildren(frag);
    }

    private createNodeElement(tech: Tech): HTMLElement {
        const div = document.createElement('div');
        div.dataset.id = this.state.getTechId(tech)!.toString();
        div.className = `node ${this.state.computeStatus(tech)}`;
        div.style.left = `${tech.x}px`;
        div.style.top = `${tech.y}px`;
        div.textContent = tech.name;
        return div;
    }

    // -------- Interactions --------
    private bindInteractions() {
        this.nodesLayer.addEventListener('click', event => {
            SoundSystem.globalSound.playSound(SoundEvents.UI_SELECT);
            this.nodesLayer.querySelector('.node.selected')?.classList.remove('selected');
            const target = (event.target as HTMLElement).closest<HTMLElement>('.node');
            this.selectNodeId = null;

            if (!target) {
                this.onSelect(null);
                return;
            }

            target.classList.add('selected');
            const id = target.dataset.id ?? null;
            this.selectNodeId = id;
            this.onSelect(id);
        }, {signal: this.abortCtrl.signal});

        this.nodesLayer.addEventListener('dblclick', this.tryApply, {signal: this.abortCtrl.signal});
        this.submitBtn.addEventListener('click', this.tryApply, {signal: this.abortCtrl.signal});
        this.resetBtn.addEventListener('click', this.resetTech, {signal: this.abortCtrl.signal});

        this.setupPanZoom(this.container, this.abortCtrl);
    }

    private tryApply() {
        const id = this.selectNodeId;
        if (!id) return;
        const tech = this.state.getTech(id);
        if (!tech) return;

        const world = this.player.getWorld();
        const score = this.player.getScore() - tech.cost;
        if (score < 0 && !this.player.isDevMode()) return;

        if (this.state.unlock(tech)) {
            this.player.setScore(score);
            this.applyUnlockUpdates(tech);
            world.events.emit(EVENTS.UNLOCK_TECH, {tech});
            SoundSystem.globalSound.playSound(SoundEvents.UI_APPLY, 1.5);
        }
    }

    private onSelect(id: string | null) {
        this.submitBtn.disabled = !id;
        if (!id) {
            this.selectNodeId = null;
            this.techTitle.textContent = '';
            this.metaShow.textContent = '';
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
        costDiv.textContent = cost === -1 ? '无法使用' : `花费: ${cost}`;
        frag.append(costDiv);

        if (requires && requires.size > 0) {
            const names = requires
                .values()
                .map(tech => tech.name)
                .toArray()
                .join(', ');

            const requireDiv = document.createElement('div');
            requireDiv.className = 'require';
            requireDiv.textContent = `前置科技: ${names}`;
            frag.append(requireDiv);
        }

        // 冲突
        const declaredConflicts = tech.conflicts;
        const branchConflicts = this.branchPeers(tech);

        if (declaredConflicts && declaredConflicts.size > 0 || branchConflicts.length > 0) {
            const allConflictIds = new Set([...declaredConflicts ?? [], ...branchConflicts]);
            const names = allConflictIds
                .values()
                .map(tech => tech.name)
                .toArray()
                .join(', ');

            const conflictDiv = document.createElement('div');
            conflictDiv.className = 'conflict';
            conflictDiv.textContent = `冲突科技: ${names}`;
            frag.append(conflictDiv);
        }

        this.techTitle.textContent = tech.name;
        this.metaShow.replaceChildren(frag);
    }

    private updateNodeClass(tech: Tech) {
        const id = this.state.getTechId(tech)?.toString();
        if (!id) return;
        const el = this.nodesLayer.querySelector<HTMLElement>(`.node[data-id="${CSS.escape(id)}"]`);
        if (!el) return;

        el.classList.remove('unlocked', 'unlockable', 'locked', 'conflicted');
        el.classList.add(this.state.computeStatus(tech));
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
        const from = this.state.getTech(line.dataset.from!)!;
        const to = this.state.getTech(line.dataset.to!)!;
        const fromUnlocked = this.state.isUnlocked(from);
        const toUnlocked = this.state.isUnlocked(to);
        const toStatus = this.state.computeStatus(to);

        line.classList.toggle('active', fromUnlocked && toUnlocked);
        line.classList.toggle('available', fromUnlocked && toStatus === 'unlockable');
        line.classList.toggle('blocked', toStatus === 'conflicted' || toStatus === 'locked');
    }

    // -------- Adjacency helpers --------
    private buildAdjacency(techs: Tech[]): Adjacency {
        const successors = new Map<Tech, Tech[]>();
        const conflicts = new Map<Tech, Tech[]>();
        const branchGroupOf = new Map<Tech, string | null>();
        const techsInBranch = new Map<string, Tech[]>();

        for (const tech of techs) {
            if (tech.requires) for (const require of tech.requires) {
                if (!successors.has(require)) successors.set(require, []);
                successors.get(require)!.push(tech);
            }
            if (tech.conflicts && tech.conflicts.size > 0) {
                conflicts.set(tech, Array.from(tech.conflicts));
            }

            branchGroupOf.set(tech, tech.branchGroup);
            if (tech.branchGroup) {
                if (!techsInBranch.has(tech.branchGroup)) techsInBranch.set(tech.branchGroup, []);
                techsInBranch.get(tech.branchGroup)!.push(tech);
            }
        }
        return {successors, conflicts, branchGroupOf, techsInBranch};
    }

    private successorsClosure(tech: Tech): Tech[] {
        const res: Tech[] = [];
        const seen = new Set<Tech>();
        const stack = this.adj.successors.get(tech);
        if (!stack) return [];

        while (stack.length) {
            const n = stack.pop()!;
            if (seen.has(n)) continue;
            seen.add(n);
            res.push(n);
            const next = this.adj.successors.get(n);
            if (next) stack.push(...next);
        }
        return res;
    }

    private branchPeers(tech: Tech): Tech[] {
        const group = this.adj.branchGroupOf.get(tech);
        if (!group) return [];
        const inGroup = this.adj.techsInBranch.get(group);
        if (!inGroup) return [];
        return inGroup.filter(x => x !== tech);
    }

    private conflictPeers(tech: Tech): Tech[] {
        return this.adj.conflicts.get(tech) ?? [];
    }

    public unloadedTechCount(): number {
        return this.state.unlocked.size;
    }

    public resetTech() {
        // noinspection DuplicatedCode
        const player = this.player;

        const allTech = this.state.allTechs;
        const unlocked: Tech[] = [];
        for (const tech of allTech) {
            if (this.state.isUnlocked(tech)) unlocked.push(tech);
        }
        if (unlocked.length === 0) return;

        let backScore = 0;
        for (const tech of unlocked) {
            const cost = tech.cost;
            if (cost) backScore += cost;
        }

        player.setScore(player.getScore() + (backScore * 0.8) | 0);
        player.clearItems();

        player.addItem(Items.CANNON40_WEAPON);
        player.addItem(Items.BOMB_WEAPON);

        player.voidEdge = false;
        player.steeringGear = false;
        player.followPointer = false;
        player.setYaw(-1.57079);

        this.state.reset();
        this.renderNodes();

        player.getNetworkChannel().send(new PlayerTechResetC2SPacket());
    }

    public writeNBT(nbt: NbtCompound): NbtCompound {
        const ids = this.state.unlocked
            .values()
            .map(tech => this.state.getTechId(tech))
            .filter(id => id !== null)
            .map(id => id.toString());

        nbt.putStringArray('Techs', ...ids);
        return nbt
    }

    public readNBT(nbt: NbtCompound) {
        const techs = nbt.getStringArray('Techs');
        if (techs.length === 0) return;
        const world = this.player.getWorld();

        for (const id of techs) {
            const tech = this.state.getTech(id);
            if (!tech) throw new Error(`Fail to parse tech with id: ${id}`);

            this.state.unlock(tech);
            this.applyUnlockUpdates(tech);
            world.events.emit(EVENTS.UNLOCK_TECH, {tech});
        }
    }
}
