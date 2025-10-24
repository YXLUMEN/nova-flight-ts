import type {CommandOutput} from "./CommandOutput.ts";
import type {IVec} from "../../utils/math/IVec.ts";
import type {ServerWorld} from "../ServerWorld.ts";
import type {NovaFlightServer} from "../NovaFlightServer.ts";
import type {Entity} from "../../entity/Entity.ts";
import {ServerPlayerEntity} from "../entity/ServerPlayerEntity.ts";
import type {CommandSource} from "../../command/CommandSource.ts";
import type {World} from "../../world/World.ts";

export class ServerCommandSource implements CommandSource {
    public readonly outPut: CommandOutput;
    public readonly position: IVec;
    public readonly world: ServerWorld;
    public readonly level: number;
    public readonly name: string;
    public readonly displayName: string;
    public readonly server: NovaFlightServer;
    public readonly silent: boolean;

    public readonly entity: Entity | null;

    public constructor(
        outPut: CommandOutput,
        position: IVec,
        world: ServerWorld,
        level: number,
        name: string,
        displayName: string,
        server: NovaFlightServer,
        silent: boolean,
        entity: Entity | null) {
        this.outPut = outPut;
        this.position = position;
        this.world = world;
        this.level = level;
        this.name = name;
        this.displayName = displayName;
        this.server = server;
        this.silent = silent;
        this.entity = entity;
    }

    public getPlayer(): ServerPlayerEntity | null {
        return this.entity instanceof ServerPlayerEntity ? this.entity : null;
    }

    public isExecutedByPlayer(): boolean {
        return this.entity instanceof ServerPlayerEntity;
    }

    public getWorld(): World | null {
        return this.world;
    }
}