import {NbtCompound} from "../nbt/NbtCompound.ts";
import {BaseDirectory, exists, mkdir, readFile, writeFile} from "@tauri-apps/plugin-fs";
import type {RegistryManager} from "../registry/RegistryManager.ts";
import {ServerNetworkChannel} from "./network/ServerNetworkChannel.ts";
import type {Consumer, UUID} from "../apis/registry.ts";
import {ServerReceive} from "./network/ServerReceive.ts";
import type {ServerWorld} from "./ServerWorld.ts";
import {WorldConfig} from "../configs/WorldConfig.ts";
import {ServerReadyS2CPacket} from "../network/packet/s2c/ServerReadyS2CPacket.ts";

export abstract class NovaFlightServer {
    public static instance: NovaFlightServer;
    public static readonly SAVE_PATH = `saves/save-${NbtCompound.VERSION}.dat`;

    public networkChannel: ServerNetworkChannel;
    public world: ServerWorld | null = null;
    public readonly loginPlayers = new Set<UUID>();

    private tickInterval: number | null = null;
    private last = 0;
    private accumulator = 0;

    private running = false;
    private waitGameStop: Promise<void> | null = null;
    private onGameStop: Consumer<NbtCompound> | null = null;

    protected constructor() {
        this.networkChannel = new ServerNetworkChannel(new WebSocket("ws://127.0.0.1:25566"));
        ServerReceive.registryNetworkHandler(this.networkChannel);
        this.networkChannel.init();
    }

    public abstract runServer(action: number): Promise<void>;

    protected async startGame(manager: RegistryManager, readSave = false): Promise<void> {
        if (this.running) return;
        this.running = true;

        const {promise, resolve} = Promise.withResolvers<void>();
        this.waitGameStop = promise;
        this.onGameStop = async (nbt: NbtCompound) => {
            try {
                await NovaFlightServer.saveGame(nbt);
            } catch (error) {
                console.error(`Error while saving game: ${error}`);
            } finally {
                this.world?.close();
                this.world = null;
                this.waitGameStop = null;
                this.last = 0;
                this.accumulator = 0;
                resolve();
            }
        };

        const mod = await import("./ServerWorld.ts");
        this.world = new mod.ServerWorld(manager, this);

        if (readSave) {
            const saves = await NovaFlightServer.loadSaves();
            if (saves) this.world.readNBT(saves);
        }

        this.networkChannel.send(new ServerReadyS2CPacket());
        this.world.setTicking(true);
        this.last = performance.now();
        this.tickInterval = setInterval(this.bindTick, 25);
    }

    public async stopGame(): Promise<void> {
        if (!this.running) {
            // 避免ts抱怨
            return this.waitGameStop ? this.waitGameStop : Promise.resolve();
        }

        this.running = false;
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }

        this.networkChannel.disconnect();

        try {
            await this.waitGameStop;
        } catch (err) {
            console.error("Error during stopGame:", err);
        }
    }

    private tick() {
        try {
            const now = performance.now();
            const world = this.world!;
            if (!this.running) {
                this.onGameStop!(world.saveAll());
                return;
            }

            const tickDelta = Math.min(0.1, (now - this.last) / 1000 || 0);
            this.last = now;
            this.accumulator += tickDelta;

            while (this.accumulator >= WorldConfig.mbps) {
                if (world.isTicking) world.tick(WorldConfig.mbps);
                this.accumulator -= WorldConfig.mbps;
            }
        } catch (error) {
            console.error(`Runtime error: ${error}`);
            this.stopGame().catch(error => console.error(error));
            throw error;
        }
    }

    private bindTick = this.tick.bind(this);

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

    public async waitForStop(): Promise<void> {
        await this.waitGameStop;
    }

    public static getInstance(): NovaFlightServer {
        return this.instance;
    }

    public get isRunning() {
        return this.running;
    }
}