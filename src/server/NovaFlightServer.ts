import {NbtCompound} from "../nbt/NbtCompound.ts";
import {BaseDirectory, exists, mkdir, readFile, writeFile} from "@tauri-apps/plugin-fs";
import {mainWindow} from "../main.ts";
import {World} from "../world/World.ts";
import type {RegistryManager} from "../registry/RegistryManager.ts";
import {WorldConfig} from "../configs/WorldConfig.ts";
import {SoundEvents} from "../sound/SoundEvents.ts";
import {GuideStage} from "../configs/GuideStage.ts";
import {AudioManager} from "../sound/AudioManager.ts";
import {Audios} from "../sound/Audios.ts";

export class NovaFlightServer {
    public static readonly SAVE_PATH = `saves/save-${NbtCompound.VERSION}.dat`;

    private static running = false;
    private static worldInstance: World | null = null;
    private static last = 0;
    private static accumulator = 0;
    private static stopResolve: (nbt: NbtCompound) => void;

    public static async startGame(manager: RegistryManager) {
        if (this.running) return;
        this.running = true;

        const world = World.createWorld(manager);
        this.worldInstance = world;

        if (WorldConfig.readSave) {
            const saves = await this.loadSaves();
            if (saves) world.readNBT(saves);
            else world.getNotify().show('无存档');
        }

        World.globalSound.playSound(SoundEvents.UI_APPLY);
        world.setTicking(true);
        world.player?.setVelocity(0, -24);

        if (!localStorage.getItem('guided')) {
            world.setStage(GuideStage);
            AudioManager.playAudio(Audios.SPACE_WALK);
        }
        this.tick(0);
    }

    private static bindTick = this.tick.bind(this);

    public static tick(ts: number) {
        const world = this.worldInstance!;
        if (!this.running) {
            this.stopResolve!(world.saveAll());
            return;
        }

        const tickDelta = Math.min(0.05, (ts - this.last) / 1000 || 0);
        this.last = ts;
        this.accumulator += tickDelta;

        while (this.accumulator >= WorldConfig.mbps) {
            world.tickWorld(WorldConfig.mbps);
            this.accumulator -= WorldConfig.mbps;
        }
        world.render();
        requestAnimationFrame(this.bindTick);
    }

    public static async saveGame(compound: NbtCompound): Promise<void> {
        try {
            await mkdir('saves', {baseDir: BaseDirectory.Resource, recursive: true});

            const bytes = compound.toBinary();
            await writeFile(this.SAVE_PATH, bytes, {baseDir: BaseDirectory.Resource});
        } catch (err) {
            console.log(err);
            alert('保存时出错');
        }
    }

    public static async loadSaves(): Promise<NbtCompound | null> {
        try {
            const available = await exists(this.SAVE_PATH, {baseDir: BaseDirectory.Resource});
            if (!available) return null;

            const bytes = await readFile(this.SAVE_PATH, {baseDir: BaseDirectory.Resource});
            if (!bytes || bytes.length === 0) return null;
            return NbtCompound.fromBinary(bytes);
        } catch (err) {
            console.log(err);
            return null;
        }
    }

    public static async stopGame(): Promise<void> {
        if (!this.running) return;
        this.running = false;

        const result = await new Promise<NbtCompound>(resolve => {
            this.stopResolve = resolve;
        });

        await this.saveGame(result);
        this.worldInstance!.destroy();
        this.worldInstance = null;

        await mainWindow.close();
    }

    public static get isRunning() {
        return this.running;
    }
}