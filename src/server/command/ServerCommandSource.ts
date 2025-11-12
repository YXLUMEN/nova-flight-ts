import type {CommandOutput} from "./CommandOutput.ts";
import type {IVec} from "../../utils/math/IVec.ts";
import type {ServerWorld} from "../ServerWorld.ts";
import type {NovaFlightServer} from "../NovaFlightServer.ts";
import type {Entity} from "../../entity/Entity.ts";
import type {ServerPlayerEntity} from "../entity/ServerPlayerEntity.ts";
import {CommandSource} from "../../command/CommandSource.ts";
import type {World} from "../../world/World.ts";

export class ServerCommandSource extends CommandSource {
    public readonly outPut: CommandOutput;
    public readonly position: IVec;
    private readonly world: ServerWorld | null;
    private readonly level: number;
    public readonly name: string;
    public readonly displayName: string;
    public readonly server: NovaFlightServer | null;
    public readonly silent: boolean;

    public readonly entity: Entity | null;

    public constructor(
        outPut: CommandOutput,
        position: IVec,
        world: ServerWorld | null,
        level: number,
        name: string,
        displayName: string,
        server: NovaFlightServer | null,
        entity: Entity | null,
        silent: boolean = false
    ) {
        super();
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
        if (this.entity?.isPlayer() && !this.entity.getWorld().isClient) {
            return this.entity as ServerPlayerEntity;
        }
        return null;
    }

    public isExecutedByPlayer(): boolean {
        return !!this.entity && this.entity.isPlayer() && !this.entity.getWorld().isClient;
    }

    public getWorld(): World | null {
        return this.world;
    }

    public hasPermissionLevel(level: number): boolean {
        return this.level >= level;
    }
}