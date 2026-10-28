import type {LocalPlayerEntity} from "../entity/LocalPlayerEntity.ts";
import type {RegistryEntry} from "../../registry/tag/RegistryEntry.ts";
import type {ClientTech} from "./ClientTech.ts";
import {as, assert, closest} from "../../utils/dom_util.ts";
import {NovaFlightClient} from "../NovaFlightClient.ts";
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
    ) {
        this.tree = tree;
        this.state = state;
        this.player = player;
        this.canvas = canvas;

        this.root = root;
        this.submitBtn = as(root, '#d-unlock', HTMLButtonElement);
        this.resetBtn = as(root, '#reset', HTMLButtonElement);
        this.resetAllBtn = as(root, '#reset-all', HTMLButtonElement);

        this.bindListener(signal);
    }

    public destroy() {
        (this.tree as any) = null;
    }

    public sync() {
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

    public select() {
        this.canvas.refresh();
        this.onSelect(this.selectNodeId);
    }

    private onSelect(id: string | null) {
        this.selectNodeId = id;
        const tech = id ? this.state.getTech(id) : null;
        this.sync();
        this.canvas.renderSelect(id, tech);
    }

    private tryApply(event: MouseEvent) {
        event.preventDefault();
        event.stopPropagation();

        const id = this.selectNodeId;
        if (!id) return;
        const tech = this.state.getTech(id);
        if (!tech) return;

        const sound = NovaFlightClient.instance().globalSound;
        const world = this.player.getWorld();
        const score = this.player.getScore() - tech.cost;
        if (score < 0 && !this.player.isDevMode()) {
            sound.playSound(SoundEvents.UI_ERROR);
            return;
        }

        if (this.state.unlock(tech)) {
            this.player.setScore(score);
            this.canvas.onApply(tech);

            world.events.emit(new UnlockTech(this.player, tech));
            sound.playSound(SoundEvents.UI_APPLY, 1.5);
            this.onSelect(id);
        } else {
            sound.playSound(SoundEvents.UI_ERROR);
        }
    }

    private bindListener(signal: AbortSignal) {
        const apply = this.tryApply.bind(this);

        const view = assert(this.root, '#viewport');
        view.addEventListener('click', event => {
            const target = closest(event.target, '.node') as HTMLElement;
            this.onSelect(target?.dataset.id ?? null);

            if (target) {
                NovaFlightClient.instance().globalSound.playSound(SoundEvents.UI_SELECT);
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