import {NbtCompound} from "../nbt/NbtCompound.ts";
import type {RegistryManager} from "../registry/RegistryManager.ts";
import {ServerNetworkChannel} from "./network/ServerNetworkChannel.ts";
import type {Consumer, UUID} from "../apis/types.ts";
import {ServerWorld} from "./ServerWorld.ts";
import {WorldConfig} from "../configs/WorldConfig.ts";
import {ServerReadyS2CPacket} from "../network/packet/s2c/ServerReadyS2CPacket.ts";
import {ServerCommandSource} from "./command/ServerCommandSource.ts";
import type {CommandOutput} from "./command/CommandOutput.ts";
import {Vec2} from "../utils/math/Vec2.ts";
import {ServerCommandManager} from "./ServerCommandManager.ts";
import {PlayerManager} from "./entity/PlayerManager.ts";
import {GameProfile} from "./entity/GameProfile.ts";
import {ServerNetworkHandler} from "./network/ServerNetworkHandler.ts";

export abstract class NovaFlightServer implements CommandOutput {
    public static readonly SAVE_PATH = `saves/save-${NbtCompound.VERSION}.dat`;
    public static instance: NovaFlightServer;

    public readonly saveName: string;
    private readSave: boolean = true;

    public readonly serverId: UUID;
    public readonly networkChannel: ServerNetworkChannel;
    public readonly serverCommandManager: ServerCommandManager;
    public readonly playerManager: PlayerManager;

    public networkHandler: ServerNetworkHandler | null = null;
    public profile: GameProfile | null = null;
    public isMultiPlayer: boolean = false;
    public world: ServerWorld | null = null;

    private tickInterval: NodeJS.Timeout | null = null;
    private last = 0;
    private accumulator = 0;

    private running = false;
    private waitWorldStop: Promise<void> | null = null;
    private stopWorld: Consumer<void> | null = null;

    private bindTick = this.tick.bind(this);

    protected constructor(secretKey: Uint8Array, saveName: string) {
        this.serverId = crypto.randomUUID();

        this.saveName = saveName;
        this.playerManager = new PlayerManager(this);
        this.networkChannel = new ServerNetworkChannel('127.0.0.1:25566', secretKey);
        this.serverCommandManager = new ServerCommandManager(this.getCommandSource());
    }

    public static getInstance(): NovaFlightServer {
        return this.instance;
    }

    public abstract runServer(action: number): Promise<void>;

    protected async startGame(manager: RegistryManager, readSave = false): Promise<void> {
        if (this.running) return;
        this.running = true;
        this.readSave = readSave;

        await this.networkChannel.connect();

        const {promise, resolve} = Promise.withResolvers<void>();
        this.waitWorldStop = promise;
        this.stopWorld = () => resolve();

        this.world = new ServerWorld(manager, this);

        if (readSave) {
            const saves = await this.loadSaves();
            if (saves) this.world.readNBT(saves);
        }

        this.profile = new GameProfile(this.networkChannel.getSessionID(), this.serverId, this.saveName);
        this.networkHandler = new ServerNetworkHandler(this);
        this.networkChannel.send(new ServerReadyS2CPacket());
        self.postMessage({type: 'server_start'});

        this.last = performance.now();
        this.tickInterval = setInterval(this.bindTick, 25);
    }

    private tick() {
        try {
            if (!this.running) return;

            const now = performance.now();
            const world = this.world!;

            const tickDelta = Math.min(0.25, (now - this.last) / 1000 || 0);
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
            await this.playerManager.saveAllPlayerData();
            const nbt = this.world!.saveAll();
            await this.saveGame(nbt);
        } catch (error) {
            console.error(`Error while saving game: ${error}`);
        }

        this.networkHandler?.disconnectAllPlayer();
        this.world?.close();

        await this.onWorldStop();
        this.stopWorld?.();

        this.waitWorldStop = null;

        this.networkChannel.disconnect();
    }

    public async waitForStop(): Promise<void> {
        await this.waitWorldStop;
    }

    public abstract onWorldStop(): Promise<void>;

    public abstract saveGame(compound: NbtCompound): Promise<void>;

    public abstract loadSaves(): Promise<NbtCompound | null>;

    public isRunning(): boolean {
        return this.running;
    }

    public isNewSave(): boolean {
        return !this.readSave;
    }

    public abstract isHost(profile: GameProfile): boolean;

    public getCommandSource(): ServerCommandSource {
        return new ServerCommandSource(
            this,
            Vec2.ZERO,
            this.world,
            10,
            'Server',
            'Server',
            this,
            null
        );
    }

    public sendMessage(msg: string): void {
        console.log(msg);
    }

    public shouldTrackOutput(): boolean {
        return true;
    }

    public cannotBeSilenced(): boolean {
        return true;
    }
}