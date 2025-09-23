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

        World.globalSound.playSound(SoundEvents.UI_APPLY);
        world.setTicking(true);
        world.player?.setVelocity(0, -24);

        if (!localStorage.getItem('guided')) {
            world.setStage(GuideStage);
            AudioManager.playAudio(Audios.SPACE_WALK, true);
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
            await mkdir('saves', {baseDir: BaseDirectory.AppData, recursive: true});

            const bytes = compound.toBinary();
            await writeFile('saves/save.dat', bytes, {baseDir: BaseDirectory.AppData});

            await mainWindow.close();
        } catch (err) {
            console.log(err);
            alert('保存时出错');
        }
    }

    public static async loadGame(): Promise<NbtCompound | null> {
        try {
            const available = await exists('saves/save.dat', {baseDir: BaseDirectory.AppData});
            if (!available) return null;

            const bytes = await readFile('saves/save.dat', {baseDir: BaseDirectory.AppData});
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