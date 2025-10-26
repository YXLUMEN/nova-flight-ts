import {NbtCompound} from "../nbt/NbtCompound.ts";
import type {RegistryManager} from "../registry/RegistryManager.ts";
import {ServerNetworkChannel} from "./network/ServerNetworkChannel.ts";
import type {Consumer, UUID} from "../apis/types.ts";
import {ServerReceive} from "./network/ServerReceive.ts";
import type {ServerWorld} from "./ServerWorld.ts";
import {WorldConfig} from "../configs/WorldConfig.ts";
import {ServerReadyS2CPacket} from "../network/packet/s2c/ServerReadyS2CPacket.ts";
import {ServerPlayNetworkHandler} from "./network/ServerPlayNetworkHandler.ts";

export abstract class NovaFlightServer {
    public static instance: NovaFlightServer;
    public static readonly SAVE_PATH = `saves/save-${NbtCompound.VERSION}.dat`;

    public readonly serverId: UUID;
    public readonly networkChannel: ServerNetworkChannel;
    public networkHandler: ServerPlayNetworkHandler | null = null;
    public world: ServerWorld | null = null;

    private tickInterval: number | null = null;
    private last = 0;
    private accumulator = 0;

    private running = false;
    private waitWorldStop: Promise<void> | null = null;
    private stopWorld: Consumer<void> | null = null;

    private bindTick = this.tick.bind(this);

    protected constructor() {
        this.serverId = crypto.randomUUID();

        this.networkChannel = new ServerNetworkChannel("127.0.0.1:25566");
        ServerReceive.registryNetworkHandler(this.networkChannel);
    }

    protected async startGame(manager: RegistryManager, readSave = false): Promise<void> {
        if (this.running) return;
        this.running = true;

        await this.networkChannel.connect();

        const {promise, resolve} = Promise.withResolvers<void>();
        this.waitWorldStop = promise;
        this.stopWorld = () => resolve();

        const mod = await import("./ServerWorld.ts");
        this.world = new mod.ServerWorld(manager, this);

        this.networkHandler = new ServerPlayNetworkHandler(this, this.world);
        this.networkHandler.registryHandler();

        if (readSave) {
            const saves = await this.loadSaves();
            if (saves) this.world.readNBT(saves);
        }

        this.networkChannel.send(new ServerReadyS2CPacket());
        this.world.setTicking(true);
        this.last = performance.now();
        this.tickInterval = setInterval(this.bindTick, 25);
    }

    private tick() {
        try {
            if (!this.running) return;

            const now = performance.now();
            const world = this.world!;

            const tickDelta = Math.min(0.1, (now - this.last) / 1000 || 0);
            this.last = now;
            this.accumulator += tickDelta;

            while (this.accumulator >= WorldConfig.mbps) {
                if (world.isTicking) world.tick(WorldConfig.mbps);
                this.accumulator -= WorldConfig.mbps;
            }
        } catch (error) {
            console.error(`Server runtime error: ${error}`);
            this.stopGame().catch(error => console.error(error));
            throw error;
        }
    }

    public async stopGame(): Promise<void> {
        if (!this.running) {
            // 避免ts抱怨
            return this.waitWorldStop ? this.waitWorldStop : Promise.resolve();
        }

        this.running = false;
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }

        try {
            const nbt = this.world!.saveAll();
            await this.saveGame(nbt);
        } catch (error) {
            console.error(`Error while saving game: ${error}`);
        }

        this.networkHandler?.disconnectAllPlayer();
        this.world?.close();
        this.world = null;

        await this.onWorldStop();
        if (this.stopWorld) this.stopWorld();
        this.waitWorldStop = null;

        this.networkChannel.disconnect();
    }

    public abstract onWorldStop(): Promise<void>;

    public abstract saveGame(compound: NbtCompound): Promise<void>;

    public abstract loadSaves(): Promise<NbtCompound | null>;

    public get isRunning() {
        return this.running;
    }

    public static getInstance(): NovaFlightServer {
        return this.instance;
    }

    public abstract runServer(action: number): Promise<void>;

    public async waitForStop(): Promise<void> {
        await this.waitWorldStop;
    }
}