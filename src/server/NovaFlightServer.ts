import {NbtCompound} from "../nbt/NbtCompound.ts";
import {BaseDirectory, exists, mkdir, readFile, writeFile} from "@tauri-apps/plugin-fs";
import {World} from "../world/World.ts";
import type {RegistryManager} from "../registry/RegistryManager.ts";
import {WorldConfig} from "../configs/WorldConfig.ts";
import {SoundEvents} from "../sound/SoundEvents.ts";
import {GuideStage} from "../configs/GuideStage.ts";
import {AudioManager} from "../sound/AudioManager.ts";
import {Audios} from "../sound/Audios.ts";
import {WorldScreen} from "../render/WorldScreen.ts";
import {SoundSystem} from "../sound/SoundSystem.ts";
import {PayloadTypeRegistry} from "../network/PayloadTypeRegistry.ts";
import {ServerNetwork} from "./network/ServerNetwork.ts";
import {NetworkChannel} from "../network/NetworkChannel.ts";
import {ServerNetworkChannel} from "./network/ServerNetworkChannel.ts";

export class NovaFlightServer {
    public static readonly SAVE_PATH = `saves/save-${NbtCompound.VERSION}.dat`;
    private static serverStart = false;
    public static networkHandler: NetworkChannel;

    private static running = false;
    private static worldInstance: World | null = null;
    private static last = 0;
    private static accumulator = 0;

    private static waitGameStop: Promise<void> | null = null;
    private static onGameStop: (nbt: NbtCompound) => void;

    public static startServer(): void {
        if (this.serverStart) return;
        this.serverStart = true;

        ServerNetwork.registerNetwork();

        const ws = new WebSocket("ws://127.0.0.1:25566");
        this.networkHandler = new ServerNetworkChannel(ws, PayloadTypeRegistry.PLAY_S2C);
        this.networkHandler.init();

        return;
    }

    public static async startGame(manager: RegistryManager, readSave = false): Promise<void> {
        if (this.running) return;
        this.running = true;

        this.waitGameStop = new Promise<void>(resolve => {
            this.onGameStop = async (nbt: NbtCompound) => {
                try {
                    await this.saveGame(nbt);
                } catch (error) {
                    console.error(`Error while saving game: ${error}`);
                } finally {
                    this.worldInstance?.destroy();
                    this.worldInstance = null;
                    this.waitGameStop = null;
                    this.last = 0;
                    this.accumulator = 0;
                    resolve();
                }
            };
        });

        const world = World.createWorld(manager);
        this.worldInstance = world;

        if (readSave) {
            const saves = await this.loadSaves();
            if (saves) {
                world.readNBT(saves);
                world.player!.invulnerable = true;
                world.schedule(1, () => world.player!.invulnerable = false);
            } else {
                WorldScreen.notify.show('无存档');
                world.player?.setVelocity(0, -24);
            }
        }

        SoundSystem.globalSound.playSound(SoundEvents.UI_APPLY);
        if (!localStorage.getItem('guided')) {
            world.setStage(GuideStage);
            AudioManager.playAudio(Audios.SPACE_WALK);
        }

        world.setTicking(true);
        this.tick(0);
    }

    public static async stopGame(): Promise<void> {
        if (!this.running) {
            // 避免ts抱怨
            return this.waitGameStop ? this.waitGameStop : Promise.resolve();
        }

        this.running = false;

        try {
            await this.waitGameStop;
        } catch (err) {
            console.error("Error during stopGame:", err);
        }
    }

    private static tick(ts: number) {
        try {
            const world = this.worldInstance!;
            if (!this.running) {
                this.onGameStop(world.saveAll());
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
        } catch (error) {
            console.error(`Runtime error: ${error}`);
            this.stopGame().catch(error => console.error(error));
            throw error;
        }
    }

    private static bindTick = this.tick.bind(this);

    public static async saveGame(compound: NbtCompound): Promise<void> {
        try {
            await mkdir('saves', {baseDir: BaseDirectory.Resource, recursive: true});

            const bytes = compound.toBinary();
            await writeFile(this.SAVE_PATH, bytes, {baseDir: BaseDirectory.Resource});
        } catch (err) {
            console.error(err);
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
            console.error(err);
            return null;
        }
    }

    public static async waitForStop(): Promise<void> {
        await this.waitGameStop;
    }

    public static get isRunning() {
        return this.running;
    }
}