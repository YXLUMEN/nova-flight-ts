import {NbtCompound} from "../nbt/NbtCompound.ts";
import type {RegistryManager} from "../registry/RegistryManager.ts";
import type {Constructor, Consumer, UUID} from "../apis/types.ts";
import {ServerWorld} from "./ServerWorld.ts";
import {WorldConfig} from "../configs/WorldConfig.ts";
import {ServerReadyS2CPacket} from "../network/packet/s2c/ServerReadyS2CPacket.ts";
import {ServerCommandSource} from "./command/ServerCommandSource.ts";
import type {CommandOutput} from "./command/CommandOutput.ts";
import {Vec2} from "../utils/math/Vec2.ts";
import {ServerCommandManager} from "./command/ServerCommandManager.ts";
import {PlayerManager} from "./entity/PlayerManager.ts";
import {GameProfile} from "./entity/GameProfile.ts";
import {ServerNetworkHandler} from "./network/ServerNetworkHandler.ts";
import {GameMessageS2CPacket} from "../network/packet/s2c/GameMessageS2CPacket.ts";
import {Result} from "../utils/result/Result.ts";
import type {ServerChannel} from "./network/ServerChannel.ts";
import {error} from "../worker/log.ts";

export abstract class NovaFlightServer implements CommandOutput {
    public static readonly SAVE_PATH = `saves/save-${NbtCompound.VERSION}.dat`;
    public static instance: NovaFlightServer;

    public readonly worldName: string;
    public readonly serverId: UUID;

    public readonly networkChannel: ServerChannel;
    public readonly serverCommandManager: ServerCommandManager;
    public readonly playerManager: PlayerManager;

    public networkHandler: ServerNetworkHandler | null = null;
    public profile: GameProfile | null = null;
    public isMultiPlayer: boolean = false;
    // startGame 后初始化
    public world: ServerWorld | null = null;

    private tickInterval: number | null = null;
    private last = 0;
    private accumulator = 0;

    private running = false;
    private waitWorldStop: Promise<void> | null = null;
    private stopWorld: Consumer<void> | null = null;

    private bindTick = this.tick.bind(this);

    protected constructor(worldName: string, channel: ServerChannel, playerManagerCon: Constructor<PlayerManager>) {
        this.serverId = crypto.randomUUID();

        this.worldName = worldName;
        this.playerManager = new playerManagerCon(this);
        this.networkChannel = channel;
        this.serverCommandManager = new ServerCommandManager(this.getCommandSource());
    }

    public static getInstance(): NovaFlightServer {
        return this.instance;
    }

    public abstract runServer(action: number): Promise<void>;

    protected async startGame(manager: RegistryManager): Promise<void> {
        if (this.running) return;
        this.running = true;

        await this.networkChannel.connect();

        const {promise, resolve} = Promise.withResolvers<void>();
        this.waitWorldStop = promise;
        this.stopWorld = () => resolve();

        this.world = new ServerWorld(manager, this);

        const loadResult = await this.loadWorld();
        if (loadResult.isErr()) {
            this.world.close();
            this.world = null;
            this.stopWorld();
            return;
        }

        this.profile = new GameProfile(this.networkChannel.getSessionId(), this.serverId, this.worldName);
        this.networkHandler = new ServerNetworkHandler(this);
        this.networkChannel.send(new ServerReadyS2CPacket());
        self.postMessage({type: 'server_start'});

        try {
            await this.playerManager.saveAllPlayerData();
            const nbt = this.world!.saveAll();
            await this.saveWorld(nbt);
        } catch (err) {
            error(`[Server] At NovaFlightServer starting, Error while saving game: ${err}`);
        }

        this.last = performance.now();
        this.tickInterval = setInterval(this.bindTick, 25);
    }

    private async loadWorld(): Promise<Result<boolean, string>> {
        try {
            const saves = await this.readSave();
            if (!saves) return Result.ok(false);
            this.world!.readNBT(saves);
            return Result.ok(true);
        } catch (error) {
            const msg = error instanceof Error ?
                `[Server] Error while load save ${error.name}:${error.message} because ${error.cause} at\n${error.stack}` :
                `[Server] Error while loading save ${error}`;

            console.error(msg);
            return Result.err(msg);
        }
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
            await this.saveWorld(nbt);
        } catch (err) {
            error(`[Server] At NovaFlightServer, Error while saving game: ${err}`);
        }

        this.networkHandler!.disconnectAllPlayer();
        this.world!.close();
        this.networkChannel.disconnect();

        await this.onWorldStop();
        this.stopWorld!();
    }

    public async waitForStop(): Promise<void> {
        await this.waitWorldStop;
    }

    public abstract onWorldStop(): Promise<void>;

    public abstract saveWorld(compound: NbtCompound): Promise<void>;

    public abstract deleteWorld(worldName: string): Promise<Result<boolean, Error>>;

    public abstract readSave(): Promise<NbtCompound | null>;

    public isRunning(): boolean {
        return this.running;
    }

    public abstract isHost(profile: GameProfile): boolean;

    public getCommandSource(): ServerCommandSource {
        return new ServerCommandSource(
            this,
            Vec2.ZERO,
            0,
            this.world,
            10,
            'Server',
            'Server',
            this,
            null
        );
    }

    public sendMessage(msg: string): void {
        this.networkChannel.send(new GameMessageS2CPacket(msg));
    }

    public shouldTrackOutput(): boolean {
        return true;
    }

    public cannotBeSilenced(): boolean {
        return true;
    }
}