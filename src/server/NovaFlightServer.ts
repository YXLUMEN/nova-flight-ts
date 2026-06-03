import {NbtCompound} from "../nbt/element/NbtCompound.ts";
import type {RegistryManager} from "../registry/RegistryManager.ts";
import type {Consumer, UUID} from "../type/types.ts";
import {ServerWorld} from "./ServerWorld.ts";
import {ServerCommandSource} from "./command/ServerCommandSource.ts";
import type {CommandOutput} from "./command/CommandOutput.ts";
import {Vec2} from "../utils/math/Vec2.ts";
import {ServerCommandManager} from "./command/ServerCommandManager.ts";
import {PlayerManager} from "./entity/PlayerManager.ts";
import {GameProfile} from "./entity/GameProfile.ts";
import {ServerNetworkManager} from "./network/ServerNetworkManager.ts";
import {Result} from "../utils/result/Result.ts";
import type {ServerChannel} from "./network/ServerChannel.ts";
import {Log} from "../worker/log.ts";
import {GameMessageS2CPacket} from "../network/packet/s2c/GameMessageS2CPacket.ts";
import {TranslatableTextS2CPacket} from "../network/packet/s2c/TranslatableTextS2CPacket.ts";
import {ServerStartS2CPacket} from "../network/packet/s2c/ServerStartS2CPacket.ts";
import {TickRateManager} from "../world/TickRateManager.ts";

export abstract class NovaFlightServer implements CommandOutput {
    public static instance: NovaFlightServer;

    public readonly worldName: string;
    public readonly serverId: UUID;

    public readonly networkChannel: ServerChannel;
    public readonly serverCommandManager: ServerCommandManager;
    public readonly playerManager: PlayerManager;

    public networkManager: ServerNetworkManager | null = null;
    public profile: GameProfile | null = null;
    public isMultiPlayer: boolean = false;
    // startGame 后初始化
    public world: ServerWorld | null = null;

    private readonly tickManager: TickRateManager;
    private pause: boolean = false;
    private tickInterval: number | undefined;
    private last = 0;
    private accumulator = 0;

    private running = false;
    private waitServerHalt: Promise<void> | null = null;
    private stopWorld: Consumer<void> | null = null;

    protected constructor(worldName: string, channel: ServerChannel) {
        this.serverId = crypto.randomUUID();

        this.worldName = worldName;
        this.playerManager = new PlayerManager(this);
        this.tickManager = new TickRateManager();
        this.networkChannel = channel;
        this.serverCommandManager = new ServerCommandManager(this.getCommandSource());
        this.tick = this.tick.bind(this);
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
        this.waitServerHalt = promise;
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
        this.networkManager = new ServerNetworkManager(this);
        this.networkChannel.send(ServerStartS2CPacket.INSTANCE);
        self.postMessage({type: 'server_start'});

        this.last = performance.now();
        this.tickInterval = setInterval(this.tick, 25);
    }

    private async loadWorld(): Promise<Result<boolean, string>> {
        try {
            const saves = await this.readSave();
            if (!saves) return Result.ok(false);

            this.world!.readNBT(saves);
            return Result.ok(true);
        } catch (err) {
            const msg = Error.isError(err)
                ? `[Server] Error while loading save ${err.name}:${err.message} because ${err.cause} at\n${err.stack}`
                : `[Server] Error while loading save ${err}`;

            Log.error(msg);
            return Result.err(msg);
        }
    }

    private tick() {
        try {
            if (!this.running) return;

            const now = performance.now();
            const world = this.world!;

            const tickDelta = Math.min(0.1, (now - this.last) / 1000 || 0);
            this.last = now;
            this.accumulator += tickDelta;

            let step = 0;
            const maxStep = this.tickManager.getMaxStep();
            const perTick = this.tickManager.mspt();
            while (this.accumulator >= perTick && step < maxStep) {
                this.networkManager!.tick();
                if (!this.pause) world.tick(perTick);
                this.accumulator -= perTick;
                step++;
            }
        } catch (error) {
            Log.error(`[Server] Server runtime error: ${error}`);
            this.halt().catch(error => console.error(error));
            throw error;
        }
    }

    public async halt(): Promise<void> {
        if (!this.running) {
            return this.waitServerHalt ? this.waitServerHalt : Promise.resolve();
        }

        this.running = false;
        clearInterval(this.tickInterval);

        try {
            await this.playerManager.saveAllPlayerData();
            const nbt = this.world!.saveAll();
            await this.saveWorld(nbt);
            console.log('[Server] World and all players are save');
        } catch (err) {
            Log.error(`[Server] At NovaFlightServer, Error while saving game: ${err}`);
        }

        this.networkManager!.close();
        this.world!.close();
        this.networkChannel.disconnect();

        await this.onHalted();
        this.stopWorld!();
    }

    public setPause(bl: boolean): void {
        this.pause = bl;
    }

    public isPaused(): boolean {
        return this.pause;
    }

    public async waitForStop(): Promise<void> {
        await this.waitServerHalt;
    }

    public abstract onHalted(): Promise<void>;

    public abstract saveWorld(compound: NbtCompound): Promise<void>;

    public abstract deleteWorld(worldName: string): Promise<Result<void, Error>>;

    public abstract readSave(): Promise<NbtCompound | null>;

    public isRunning(): boolean {
        return this.running;
    }

    public abstract isHost(profile: GameProfile): boolean;

    public abstract isHostUUID(uuid: UUID): boolean;

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
        this.networkChannel.enqueue(new GameMessageS2CPacket(msg));
    }

    public sendTranslatable(key: string, args?: string[]): void {
        this.networkChannel.enqueue(new TranslatableTextS2CPacket(key, args ?? []));
    }

    public shouldTrackOutput(): boolean {
        return true;
    }

    public cannotBeSilenced(): boolean {
        return true;
    }
}