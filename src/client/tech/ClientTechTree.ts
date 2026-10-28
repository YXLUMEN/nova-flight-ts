import type {NbtCompound} from "../../nbt/element/NbtCompound.ts";
import type {TechTree} from "../../world/tech/TechTree.ts";
import type {LocalPlayerEntity} from "../entity/LocalPlayerEntity.ts";
import type {Consumer} from "../../type/types.ts";
import type {ClientTech} from "./ClientTech.ts";
import type {Tech} from "../../world/tech/Tech.ts";
import type {RegistryEntry} from "../../registry/tag/RegistryEntry.ts";
import {empty} from "../../utils/util.ts";
import {assert, bindFrom} from "../../utils/dom_util.ts";
import {appEvent} from "../../event/EventBus.ts";
import {TechState} from "../../world/tech/TechState.ts";
import {Items} from "../../item/Items.ts";
import {PlayerResetAllTechC2SPacket} from "../../network/packet/c2s/PlayerResetAllTechC2SPacket.ts";
import {Registries} from "../../registry/Registries.ts";
import {PlayerResetTechC2SPacket} from "../../network/packet/c2s/PlayerResetTechC2SPacket.ts";
import {NovaFlightClient} from "../NovaFlightClient.ts";
import {ClientTechManager} from "./ClientTechManager.ts";
import {UnlockTech} from "../../event/events/UnlockTech.ts";
import {PageSection} from "../page/PageSection.ts";
import {TechTreeCanvas} from "./TechTreeCanvas.ts";
import {TechInspector} from "./TechInspector.ts";

export class ClientTechTree extends PageSection implements TechTree {
    private readonly player: LocalPlayerEntity;
    private readonly playerScore: HTMLElement;

    private readonly state: TechState<ClientTech>;
    private readonly inspector: TechInspector;
    private readonly canvas: TechTreeCanvas;

    private readonly ctrl: AbortController = new AbortController();
    private renderDisable: Consumer<void> = empty;

    public constructor(player: LocalPlayerEntity) {
        super('tech-shell');

        this.closeOnEscape = true;

        this.player = player;
        this.playerScore = assert(this.root, '#player-money');

        const techStatus = assert(this.root, '#d-status');
        const bind = bindFrom(this.root);

        const techState = Registries.TECH
            .getEntries()
            .map(entry => entry.getValue())
            .toArray() as ClientTech[];

        this.state = new TechState<ClientTech>(techState);

        this.canvas = new TechTreeCanvas(
            this.root,
            this.state,
            this.ctrl.signal,
            bind.add(techStatus, '')
        );

        this.inspector = new TechInspector(
            this,
            this.root,
            this.state,
            this.ctrl.signal,
            this.player,
            this.canvas,
        );

        bind.refresh();

        appEvent.withSignal('ui:lang', () => {
            bind.refresh();
            this.canvas.renderNodes();
        }, this.ctrl.signal);

        this.root.addEventListener('player.score', event => {
            this.playerScore.textContent = String((event as CustomEvent).detail);
        }, {signal: this.ctrl.signal});

        this.canvas.renderEdges();
        this.canvas.renderNodes();
        this.inspector.sync();
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
        this.state.clear();

        this.inspector.destroy();
        this.canvas.destroy();

        this.root.classList.remove('has-selection');
        this.root.removeAttribute('data-state');
        this.playerScore.textContent = '0';
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

        this.inspector.select();

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
        this.inspector.select();

        player.sendPacket(PlayerResetAllTechC2SPacket.INSTANCE);
    }

    private resetPlayer() {
        const player = this.player;
        player.clearItems();

        player.addItem(Items.CANNON40);
        player.addItem(Items.BOMB_WEAPON);

        player.steeringGear = false;
        player.followPointer = false;
        player.autoAim = null;
        player.bc = null;
        player.setYaw(-1.57079);
    }

    public writeNBT(nbt: NbtCompound): NbtCompound {
        const ids = this.state.unlocked
            .values()
            .map(tech => this.state.getTechId(tech))
            .filter(id => id !== null)
            .map(id => id.toString())
            .toArray();

        nbt.setStringArray('techs', ids);
        return nbt;
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

        this.inspector.select();
    }
}
