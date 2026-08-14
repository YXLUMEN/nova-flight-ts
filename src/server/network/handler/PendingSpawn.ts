import {type NovaFlightServer} from "../../NovaFlightServer.ts";
import {type GameProfile} from "../../entity/GameProfile.ts";
import {Vec2} from "../../../utils/math/Vec2.ts";
import {Codecs} from "../../../serialization/Codecs.ts";
import {Optional} from "../../../utils/Optional.ts";
import {ServerPlayerEntity} from "../../entity/ServerPlayerEntity.ts";
import {type NbtCompound} from "../../../nbt/element/NbtCompound.ts";
import {type ServerConnection} from "../ServerConnection.ts";
import {RacePromise} from "../../../utils/RacePromise.ts";
import {timeout} from "../../../utils/uit.ts";
import {World} from "../../../world/World.ts";
import type {Consumer} from "../../../type/types.ts";

export class PendingSpawn implements Disposable {
    private static readonly POS_CODEC = Codecs.group<PlayerPosition>(
        Codecs.optionalField('pos', Codecs.VEC2).for(val => val.pos),
        Codecs.optionalField('yaw', Codecs.FLOAT).for(val => val.yaw),
    ).apply((pos: Optional<Vec2>, yaw: Optional<number>): PlayerPosition => ({pos, yaw}));

    private static readonly EMPTY_POS: PlayerPosition = {
        pos: Optional.of(new Vec2(World.MAP_WIDTH / 2, World.MAP_HEIGHT - 100)),
        yaw: Optional.of(-1.57079)
    };

    private readonly server: NovaFlightServer;
    private readonly profile: GameProfile;

    private readonly disposer: Consumer<void>;
    private readonly race = new RacePromise();
    private readonly timeout: number;

    private state: LoadingState = LoadingState.INIT;
    private task: Promise<void> | null = null;

    private playerData: NbtCompound | null = null;
    private spawnPos: Vec2 = Vec2.ZERO;
    private spawnYaw: number = 0;

    public constructor(server: NovaFlightServer, profile: GameProfile, timeout: number = 8000) {
        if (server.playerManager.hasLogin(profile.clientId)) throw new Error();

        this.server = server;
        this.profile = profile;
        this.timeout = timeout;
        this.disposer = this.server.playerManager.addLogin(this.profile.clientId);
    }

    public start(): Promise<void> {
        if (this.race.isAbort()) return Promise.resolve();

        if (!this.task) {
            this.task = this.race.wait(this.load(), timeout(this.timeout, this.race.signal()));
            this.state = LoadingState.PENDING;
        }
        return this.task;
    }

    public close() {
        this.race.abort();
        this.disposer();
        this.task = null;
        this.playerData = null;
        this.state = LoadingState.INIT;
    }

    public spawn(connection: ServerConnection): ServerPlayerEntity | null {
        if (!this.server.world || this.state !== LoadingState.READY) return null;

        try {
            const player = new ServerPlayerEntity(this.server.world, this.profile);
            if (this.playerData) player.readNBT(this.playerData);
            player.snapTo(this.spawnPos.x, this.spawnPos.y, this.spawnYaw);

            this.server.playerManager.placePlayer(connection, this.profile, player);
            return player;
        } catch (err) {
            console.error('[Server] Fail while spawn player', err);
            return null;
        }
    }

    public ready() {
        return this.state === LoadingState.READY;
    }

    private async load() {
        if (this.race.isAbort()) return;
        const loaded = await this.server.playerManager.loadPlayerData(this.profile);
        if (this.race.isAbort()) return;

        const optional = Optional.ofNullable(loaded);
        const playerPosition = optional.flatMap(nbt => nbt.read(PendingSpawn.POS_CODEC))
            .orElse(PendingSpawn.EMPTY_POS);

        this.spawnPos = playerPosition.pos.orElse(Vec2.ZERO);
        this.spawnYaw = playerPosition.yaw.orElse(0);
        this.playerData = loaded;
        this.state = LoadingState.READY;
    }

    public [Symbol.dispose](): void {
        this.close();
    }
}

interface PlayerPosition {
    pos: Optional<Vec2>;
    yaw: Optional<number>;
}

const enum LoadingState {
    INIT,
    PENDING,
    READY,
}