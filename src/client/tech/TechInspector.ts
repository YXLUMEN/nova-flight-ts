import type {LocalPlayerEntity} from "../entity/LocalPlayerEntity.ts";
import type {RegistryEntry} from "../../registry/tag/RegistryEntry.ts";
import type {ClientTech} from "./ClientTech.ts";
import type {SoundSystem} from "../../sound/SoundSystem.ts";
import {as, assert, closest} from "../../utils/dom_util.ts";
import {SoundEvents} from "../../sound/SoundEvents.ts";
import {Registries} from "../../registry/Registries.ts";
import {UnlockTech} from "../../event/events/UnlockTech.ts";
import {TechState} from "../../world/tech/TechState.ts";
import {TechTreeCanvas} from "./TechTreeCanvas.ts";
import {ClientTechTree} from "./ClientTechTree.ts";

export class TechInspector {
    private readonly tree: ClientTechTree;
    private readonly player: LocalPlayerEntity;
    private readonly state: TechState<ClientTech>;

    private readonly canvas: TechTreeCanvas;
    private readonly sound: SoundSystem;

    private readonly root: HTMLElement;
    private readonly submitBtn: HTMLButtonElement;
    private readonly resetBtn: HTMLButtonElement;
    private readonly resetAllBtn: HTMLButtonElement;

    private selectNodeId: string | null = null;

    public constructor(
        tree: ClientTechTree,
        root: HTMLElement,
        state: TechState<ClientTech>,
        signal: AbortSignal,
        player: LocalPlayerEntity,
        canvas: TechTreeCanvas,
        sound: SoundSystem,
    ) {
        this.tree = tree;
        this.state = state;
        this.player = player;
        this.canvas = canvas;
        this.sound = sound;

        this.root = root;
        this.submitBtn = as(root, '#d-unlock', HTMLButtonElement);
        this.resetBtn = as(root, '#reset', HTMLButtonElement);
        this.resetAllBtn = as(root, '#reset-all', HTMLButtonElement);

        this.bindListener(signal);
    }

    public destroy() {
        (this.tree as any) = null;
    }

    public refresh() {
        this.canvas.refreshNodes();
        this.onSelect(this.selectNodeId);
    }

    public select() {
        this.onSelect(this.selectNodeId);
    }

    private refreshSelectStatus() {
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
        this.refreshSelectStatus();
        this.canvas.renderSelect(id, tech);
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
            this.sound.playSound(SoundEvents.UI_ERROR);
            return;
        }

        if (this.state.unlock(tech)) {
            this.player.setScore(score);
            this.canvas.onApply(tech);

            world.events.emit(new UnlockTech(this.player, tech));
            this.sound.playSound(SoundEvents.UI_APPLY, 1.5);
            this.refreshSelectStatus();
        } else {
            this.sound.playSound(SoundEvents.UI_ERROR);
        }
    }

    private bindListener(signal: AbortSignal) {
        const apply = this.tryApply.bind(this);

        const view = assert(this.root, '#viewport');
        view.addEventListener('click', event => {
            const target = closest(event.target, '.node') as HTMLElement | null;
            const id = target?.dataset.id ?? null;

            if (this.selectNodeId !== id) {
                this.onSelect(id);
            }

            if (target) {
                this.sound.playSound(SoundEvents.UI_SELECT);
            }
        }, {signal});
        view.addEventListener('dblclick', apply, {signal});

        this.submitBtn.addEventListener('click', apply, {signal});
        this.resetBtn.addEventListener('click', () => {
            const id = this.selectNodeId;
            if (!id) return;
            const tech = this.state.getTech(id);
            if (!tech) return;
            const entry = Registries.TECH.getEntryByValue(tech);
            if (!entry) return;

            this.tree.resetTech(entry as RegistryEntry<ClientTech>);
        }, {signal});

        this.resetAllBtn.addEventListener('click', () => this.tree.resetAllTech(), {signal});
    }
}