import type {NbtCompound} from "../../nbt/element/NbtCompound.ts";
import type {TechTree} from "../../world/tech/TechTree.ts";
import type {LocalPlayerEntity} from "../entity/LocalPlayerEntity.ts";
import type {Consumer} from "../../type/types.ts";
import type {ClientTech} from "./ClientTech.ts";
import type {Tech} from "../../world/tech/Tech.ts";
import type {RegistryEntry} from "../../registry/tag/RegistryEntry.ts";
import {cleanObj, empty} from "../../utils/util.ts";
import {clamp} from "../../utils/math/math.ts";
import {as, assert, bindFrom, closest} from "../../utils/dom_util.ts";
import {appEvent} from "../../event/EventBus.ts";
import {TechState} from "../../world/tech/TechState.ts";
import {Items} from "../../item/Items.ts";
import {SoundEvents} from "../../sound/SoundEvents.ts";
import {PlayerResetAllTechC2SPacket} from "../../network/packet/c2s/PlayerResetAllTechC2SPacket.ts";
import {Registries} from "../../registry/Registries.ts";
import {PlayerResetTechC2SPacket} from "../../network/packet/c2s/PlayerResetTechC2SPacket.ts";
import {AnsiParser} from "../../utils/AnsiParser.ts";
import {NovaFlightClient} from "../NovaFlightClient.ts";
import {ModelManager} from "../render/model/ModelManager.ts";
import {ClientTechManager} from "./ClientTechManager.ts";
import {UnlockTech} from "../../event/events/UnlockTech.ts";
import {PageSection} from "../page/PageSection.ts";

export class ClientTechTree extends PageSection implements TechTree {
    public readonly playerScore = document.getElementById('player-money')!;
    private readonly player: LocalPlayerEntity;

    private readonly submitBtn: HTMLButtonElement;
    private readonly resetBtn: HTMLButtonElement;
    private readonly resetAllBtn: HTMLButtonElement;

    private readonly techTitle: HTMLElement;
    private readonly techStatus: HTMLElement;
    private readonly techTexture: HTMLImageElement;
    private readonly metaShow: HTMLElement;

    private readonly nodeWidth = 144;
    private readonly nodeHeight = 40;
    private readonly container: HTMLElement;
    private readonly svg: SVGSVGElement;
    private readonly nodesLayer: HTMLElement;

    private readonly state: TechState<ClientTech>;
    private readonly adj: Adjacency;

    private readonly ctrl: AbortController = new AbortController();

    private selectNodeId: string | null = null;
    private renderDisable: Consumer<void> = empty;

    public constructor(player: LocalPlayerEntity) {
        super('tech-shell');

        this.closeOnEscape = true;

        this.player = player;
        this.container = assert(this.root, '#viewport');
        this.submitBtn = as(this.root, '#d-unlock', HTMLButtonElement);
        this.resetBtn = as(this.root, '#reset', HTMLButtonElement);
        this.resetAllBtn = as(this.root, '#reset-all', HTMLButtonElement);

        this.techTitle = assert(this.root, '#d-title');
        this.techStatus = assert(this.root, '#d-status');
        this.techTexture = as(this.root, '#d-texture', HTMLImageElement);
        this.metaShow = assert(this.root, '#d-meta');

        this.container.replaceChildren();
        const svgNS = 'http://www.w3.org/2000/svg';

        this.svg = document.createElementNS(svgNS, 'svg');
        this.svg.classList.add('edges');

        this.nodesLayer = document.createElement('div');
        this.nodesLayer.classList.add('nodes');
        this.container.append(this.svg, this.nodesLayer);

        const techState = Registries.TECH
            .getEntries()
            .map(entry => entry.getValue())
            .toArray() as ClientTech[];
        this.state = new TechState<ClientTech>(techState);
        this.adj = this.buildAdjacency(techState);

        this.techTexture.addEventListener('error', () => {
            if (this.techTexture.src === '/texture/default.png') return;
            this.techTexture.src = '/texture/default.png';
        }, {signal: this.ctrl.signal});

        const bind = bindFrom(this.root);
        appEvent.on('ui:lang', () => bind.refresh());
        bind.refresh();

        this.root.addEventListener('player.score', event => {
            this.playerScore.textContent = String((event as CustomEvent).detail);
        }, {signal: this.ctrl.signal});

        this.tryApply = this.tryApply.bind(this);
        this.renderEdges();
        this.renderNodes();
        this.bindInteractions();
        this.syncSelectionState();
    }

    public unlock(tech: RegistryEntry<ClientTech>): boolean {
        return this.state.unlock(tech.getValue());
    }

    public forceUnlock(tech: RegistryEntry<ClientTech>): void {
        this.state.forceUnlock(tech.getValue());
        ClientTechManager.apply(tech, this.player);
    }

    public isUnlocked(tech: RegistryEntry<ClientTech>): boolean {
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
            ClientTechManager.apply(entry, this.player);
        }
        this.updateEdgesAround(allTech.values()
            .map(tech => this.state.getTechId(tech))
            .filter(tech => tech !== null)
            .map(id => id.toString())
            .toArray()
        );
        this.syncSelectionState();
    }

    protected override onOpened() {
        const client = NovaFlightClient.instance();
        client.setPause(true);
        this.renderDisable();
        this.renderDisable = client.worldRender.disable();
    }

    protected override onClosed() {
        const client = NovaFlightClient.instance();
        client.setPause(false);
        this.renderDisable();
        this.renderDisable = empty;
    }

    protected override onDestroy() {
        this.ctrl.abort();
        this.adj.successors.clear();
        this.adj.techsInBranch.clear();
        this.adj.branchGroupOf.clear();
        this.adj.conflicts.clear();
        this.state.clear();

        this.container.replaceChildren();
        this.svg.remove();
        this.nodesLayer.remove();
        this.root.classList.remove('has-selection');
        this.root.removeAttribute('data-state');
        this.playerScore.textContent = '0';
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

    private setupPanZoom(container: HTMLElement, signal: AbortSignal): void {
        const parent = container.parentElement as HTMLElement;
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
            container.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
        }
    }

    // -------- Rendering --------
    private renderEdges() {
        const svgNS = 'http://www.w3.org/2000/svg';
        this.svg.textContent = '';

        this.state.allTechs.forEach(to => {
            if (to.requires === null) return;

            to.requires.forEach(from => {
                if (to.drawExcept && to.drawExcept.has(from)) return;

                const path = document.createElementNS(svgNS, 'path');
                path.dataset.from = this.state.getTechId(from as ClientTech)!.toString();
                path.dataset.to = this.state.getTechId(to)!.toString();
                path.setAttribute('d', this.edgePath(from as ClientTech, to));
                path.classList.add('edge');
                this.svg.appendChild(path);
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
            mark.setAttribute('aria-hidden', 'true');
            div.append(mark);
        }

        return div;
    }

    // -------- Interactions --------
    private applyUnlockUpdates(tech: ClientTech) {
        const affected = new Set<ClientTech>();

        const add = (ids: Iterable<ClientTech>) => {
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
        for (const t of affected) {
            this.updateNodeClass(t);
        }

        // 更新相关边
        this.updateEdgesAround(affected
            .values()
            .map(tech => this.state.getTechId(tech))
            .filter(id => id !== null)
            .map(id => id.toString())
            .toArray()
        );
    }

    private bindInteractions() {
        const signal = this.ctrl.signal;

        this.nodesLayer.addEventListener('click', event => {
            const target = closest(event.target, '.node') as HTMLElement;
            this.onSelect(target?.dataset.id ?? null);

            if (target) {
                NovaFlightClient.instance().globalSound.playSound(SoundEvents.UI_SELECT);
            }
        }, {signal});

        this.nodesLayer.addEventListener('dblclick', this.tryApply, {signal});

        this.submitBtn.addEventListener('click', this.tryApply, {signal});
        this.resetBtn.addEventListener('click', () => {
            const id = this.selectNodeId;
            if (!id) return;
            const tech = this.state.getTech(id);
            if (!tech) return;
            const entry = Registries.TECH.getEntryByValue(tech);
            if (!entry) return;

            this.resetTech(entry as RegistryEntry<ClientTech>);
        }, {signal});
        this.resetAllBtn.addEventListener('click', this.resetAllTech.bind(this), {signal});

        this.setupPanZoom(this.container, signal);
    }

    private tryApply(event: MouseEvent) {
        event.preventDefault();
        event.stopPropagation();

        const id = this.selectNodeId;
        if (!id) return;
        const tech = this.state.getTech(id);
        if (!tech) return;

        const world = this.player.getWorld();
        const score = this.player.getScore() - tech.cost;
        if (score < 0 && !this.player.isDevMode()) {
            NovaFlightClient.instance().globalSound.playSound(SoundEvents.UI_ERROR);
            return;
        }

        if (this.state.unlock(tech)) {
            this.player.setScore(score);
            this.applyUnlockUpdates(tech);
            world.events.emit(new UnlockTech(this.player, tech));
            NovaFlightClient.instance().globalSound.playSound(SoundEvents.UI_APPLY, 1.5);
            this.onSelect(id);
        } else {
            NovaFlightClient.instance().globalSound.playSound(SoundEvents.UI_ERROR);
        }
    }

    private syncSelectionState(): void {
        const id = this.selectNodeId;
        const tech = id ? this.state.getTech(id) : null;
        const status = tech ? this.state.computeStatus(tech) : null;

        this.root.classList.toggle('has-selection', tech !== null);
        if (status) {
            this.root.setAttribute('data-state', status);
        } else {
            this.root.removeAttribute('data-state');
        }

        this.submitBtn.disabled = status !== 'unlockable';
        this.resetBtn.disabled = status !== 'unlocked';
        this.resetAllBtn.disabled = this.state.unlocked.size === 0;
    }

    private onSelect(id: string | null) {
        this.selectNodeId = id;

        const tech = id ? this.state.getTech(id) : null;
        this.syncSelectionState();

        this.nodesLayer.querySelector('.node.selected')?.classList.remove('selected');

        if (!id || !tech) {
            this.selectNodeId = null;
            this.techTexture.classList.add('hidden');
            this.techTexture.removeAttribute('src');
            this.techTexture.alt = '';
            this.techTitle.textContent = '';
            this.techStatus.textContent = '';
            this.metaShow.textContent = '';
            return;
        }

        this.nodesLayer
            .querySelector<HTMLElement>(`.node[data-id="${CSS.escape(id)}"]`)
            ?.classList.add('selected');

        const {desc, cost, requires} = tech;
        const status = this.state.computeStatus(tech);

        this.techStatus.textContent = STATUS_TEXT[status];

        const frag = document.createDocumentFragment();

        const descDiv = document.createElement('div');
        descDiv.append(AnsiParser.parseToElement(desc.toString()));
        descDiv.className = 'desc';
        frag.append(descDiv);

        const addRow = (label: string, value: string, className: string) => {
            const row = document.createElement('div');
            row.className = `meta-row ${className}`;

            const labelEl = document.createElement('span');
            labelEl.className = 'meta-label';
            labelEl.textContent = label;

            const valueEl = document.createElement('span');
            valueEl.className = 'meta-value';
            valueEl.textContent = value;

            row.append(labelEl, valueEl);
            frag.append(row);
        };

        addRow('研究点数', cost === -1 ? '不可用' : String(cost), 'cost');

        if (requires && requires.size > 0) {
            const names = requires
                .values()
                .map(tech => tech.name.toString())
                .toArray()
                .join(' / ');

            addRow('前置科技', names, 'requires');
        }

        // 冲突
        const declaredConflicts = tech.conflicts;
        const branchConflicts = this.branchPeers(tech);
        const allConflicts = new Set([...declaredConflicts ?? [], ...branchConflicts]);

        if (allConflicts.size > 0) {
            const names = allConflicts
                .values()
                .map(tech => tech.name.toString())
                .toArray()
                .join(' / ');

            addRow('冲突科技', names, 'conflicts');
        }

        const name = tech.name.toString();
        const src = ModelManager.getTechModel(tech).getCovered();
        this.techTexture.classList.remove('hidden');
        this.techTexture.src = src;
        this.techTexture.alt = name;

        this.techTitle.textContent = name;
        this.metaShow.replaceChildren(frag);
    }

    private updateNodeClass(tech: ClientTech) {
        const id = this.state.getTechId(tech)?.toString();
        if (!id) return;
        const ele = this.nodesLayer.querySelector<HTMLElement>(`.node[data-id="${CSS.escape(id)}"]`);
        if (!ele) return;

        ele.classList.remove('unlocked', 'unlockable', 'locked', 'conflicted');
        ele.classList.add(this.state.computeStatus(tech));

        if (!this.state.isUnlocked(tech)) return;
        ele.classList.add('just-unlocked');
    }

    private updateEdgesAround(ids: string[]) {
        const selector = ids
            .map(id => `[data-from="${CSS.escape(id)}"],[data-to="${CSS.escape(id)}"]`)
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

    private buildAdjacency(techs: ClientTech[]): Adjacency {
        const successors = new Map<ClientTech, ClientTech[]>();
        const conflicts = new Map<ClientTech, ClientTech[]>();
        const branchGroupOf = new Map<ClientTech, string | null>();
        const techsInBranch = new Map<string, ClientTech[]>();

        for (const tech of techs) {
            if (tech.requires) for (const require of tech.requires) {
                successors.getOrInsertComputed(require as ClientTech, () => []).push(tech);
            }
            if (tech.conflicts && tech.conflicts.size > 0) {
                conflicts.set(tech, Array.from(tech.conflicts) as ClientTech[]);
            }

            branchGroupOf.set(tech, tech.branchGroup);
            if (tech.branchGroup) {
                if (!techsInBranch.has(tech.branchGroup)) techsInBranch.set(tech.branchGroup, []);
                techsInBranch.get(tech.branchGroup)!.push(tech);
            }
        }
        return cleanObj({successors, conflicts, branchGroupOf, techsInBranch});
    }

    private successorsClosure(tech: ClientTech): ClientTech[] {
        const res: ClientTech[] = [];
        const seen = new Set<ClientTech>();
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

    private branchPeers(tech: ClientTech): ClientTech[] {
        const group = this.adj.branchGroupOf.get(tech);
        if (!group) return [];
        const inGroup = this.adj.techsInBranch.get(group);
        if (!inGroup) return [];
        return inGroup.filter(x => x !== tech);
    }

    private conflictPeers(tech: ClientTech): ClientTech[] {
        return this.adj.conflicts.get(tech) ?? [];
    }

    public unloadedTechCount(): number {
        return this.state.unlocked.size;
    }

    public resetTech(entry: RegistryEntry<ClientTech>): boolean {
        const tech = entry.getValue();
        if (!this.state.isUnlocked(tech)) {
            return false;
        }

        const techsToRevoke = this.state.collectDescendantsToRevoke(tech);
        if (techsToRevoke.length === 0) return false;

        let backScore = 0;
        for (const revoke of techsToRevoke) {
            const entry = Registries.TECH.getEntryByValue(revoke);
            if (!entry) continue;

            this.state.unlocked.delete(revoke);
            backScore += revoke.cost;
            ClientTechManager.remove(entry, this.player);
        }

        const finalScore = this.player.getScore() + Math.floor(backScore * 0.8);
        this.player.setScore(finalScore);

        this.updateAllEdgeClasses();
        this.renderNodes();
        this.onSelect(this.selectNodeId);

        this.player.sendPacket(new PlayerResetTechC2SPacket(entry));
        return true;
    }

    public resetAllTech() {
        // noinspection DuplicatedCode
        const player = this.player;
        const unlocked: Tech[] = this.state.getUnlocked().toArray();
        if (unlocked.length === 0) return;

        let backScore = 0;
        for (const tech of unlocked) {
            backScore += tech.cost;
        }

        player.setScore(player.getScore() + Math.floor(backScore * 0.8));
        this.resetPlayer();

        this.state.reset();
        this.updateAllEdgeClasses();
        this.renderNodes();
        this.onSelect(this.selectNodeId);

        player.sendPacket(PlayerResetAllTechC2SPacket.INSTANCE);
    }

    private resetPlayer() {
        this.player.clearItems();

        this.player.addItem(Items.CANNON40);
        this.player.addItem(Items.BOMB_WEAPON);

        this.player.steeringGear = false;
        this.player.followPointer = false;
        this.player.autoAim = null;
        this.player.bc = null;
        this.player.setYaw(-1.57079);
    }

    public writeNBT(nbt: NbtCompound): NbtCompound {
        const ids = this.state.unlocked
            .values()
            .map(tech => this.state.getTechId(tech))
            .filter(id => id !== null)
            .map(id => id.toString())
            .toArray();

        nbt.setStringArray('techs', ids);
        return nbt
    }

    public readNBT(nbt: NbtCompound) {
        const techs = nbt.getStringArray('techs');
        if (techs.length === 0) return;
        const world = this.player.getWorld();

        for (const id of techs) {
            const tech = this.state.getTech(id);
            if (!tech) throw new Error(`Fail to parse tech with id: ${id}`);

            this.state.unlock(tech);
            world.events.emit(new UnlockTech(this.player, tech, true));
        }

        this.updateAllEdgeClasses();
        this.renderNodes();
        this.onSelect(this.selectNodeId);
    }
}

interface Adjacency {
    successors: Map<ClientTech, ClientTech[]>; // tech -> successors
    conflicts: Map<ClientTech, ClientTech[]>; // tech -> conflicts
    branchGroupOf: Map<ClientTech, string | null>; // tech -> branchGroup
    techsInBranch: Map<string, ClientTech[]>; // branchGroup -> Techs
}

const STATUS_TEXT = {
    unlocked: '已解锁',
    unlockable: '可研究',
    locked: '前置未满足',
    conflicted: '存在冲突',
} as const;