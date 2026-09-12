import type {ServerCommandSource} from "../server/command/ServerCommandSource.ts";
import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import {argument, literal} from "../brigadier/builder/CommandNodeBuilder.ts";
import type {Identifier} from "../registry/Identifier.ts";
import {IdentifierArgumentType} from "./argument/IdentifierArgumentType.ts";
import {CommandUtil} from "./CommandUtil.ts";
import {Registries} from "../registry/Registries.ts";
import {CommandError, IllegalArgumentError, IllegalStateError} from "../type/errors.ts";
import type {Entity} from "../entity/Entity.ts";
import type {PosArgument} from "./argument/PosArgument.ts";
import {PosArgumentType} from "./argument/PosArgumentType.ts";
import type {CommandContext} from "../brigadier/context/CommandContext.ts";
import {EntityTypes} from "../entity/EntityTypes.ts";
import {IntArgumentType} from "./argument/IntArgumentType.ts";
import type {EntityType} from "../entity/EntityType.ts";
import {NbtCompoundArgumentType} from "./argument/NbtCompoundArgumentType.ts";
import {NbtCompound} from "../nbt/element/NbtCompound.ts";
import type {Vec2} from "../utils/math/Vec2.ts";
import {isDev} from "../configs/RuntimeConfig.ts";
import type {World} from "../world/World.ts";
import type {Consumer} from "../type/types.ts";

export class SummonEntityCommand {
    public static registry<T extends ServerCommandSource>(dispatcher: CommandDispatcher<T>) {
        const summonEntity = this.summonEntity.bind(this);
        dispatcher.registry(
            literal<T>('summon')
                .then(
                    argument<T, Identifier>('entity', IdentifierArgumentType.identifier())
                        .executes(summonEntity)
                        .suggests(CommandUtil.createIdentifierSuggestion(Registries.ENTITY_TYPE))
                        .then(
                            argument<T, PosArgument>('pos', PosArgumentType.pos())
                                .executes(summonEntity)
                                .then(
                                    argument<T, number>('count', IntArgumentType.int())
                                        .executes(summonEntity)
                                        .then(
                                            argument<T, NbtCompound>('nbt', NbtCompoundArgumentType.nbt())
                                                .executes(summonEntity)
                                        )
                                )
                        )
                )
                .requires(source => source.hasPermissionLevel(7))
        );
    }

    private static summonEntity<T extends ServerCommandSource>(ctx: CommandContext<T>) {
        const entityArg = ctx.args.get('entity');
        if (!entityArg) throw new CommandError("\x1b[33m<entity> is required");

        const type = Registries.ENTITY_TYPE.getById(entityArg.result);
        if (!type) throw new CommandError(`Entity type ${entityArg.result} is not registered`);

        if (type === EntityTypes.PLAYER) {
            throw new Error('Can not summon a player');
        }

        const nbtArg = ctx.args.get('nbt');
        let nbt: NbtCompound | undefined = nbtArg?.result;

        const countArg = ctx.args.get('count');
        if (countArg && countArg.result > 1) {
            this.summonBatch(ctx, countArg.result, type, nbt);
            return;
        }

        try {
            const world = ctx.source.getWorld()!;
            const entity = type.create(world) as Entity;
            if (nbt) entity.readNBT(nbt);

            entity.setPositionByVec(this.getSpawnPos(ctx));
            world.addEntity(entity);
            ctx.source.outPut.sendMessage(`Success summon ${type.toString()}`);
        } catch (error) {
            console.warn(error);
            throw new CommandError(`\x1b[33mFail to summon entity`);
        }
    }

    private static getSpawnPos<T extends ServerCommandSource>(ctx: CommandContext<T>): Vec2 {
        const arg = ctx.args.get('pos');
        if (!arg) return ctx.source.position;

        const posArg = arg.result as PosArgument;
        return posArg.toAbsolutePos(ctx.source);
    }

    private static summonBatch<T extends ServerCommandSource>(
        ctx: CommandContext<T>,
        count: number,
        type: EntityType<any>,
        nbt?: NbtCompound,
    ) {
        if (!isDev && (count <= 0 || count > 255)) {
            throw new IllegalArgumentError('Summon count should in [1-255]');
        }

        const world = ctx.source.getWorld()!;
        const pos = this.getSpawnPos(ctx);

        if (count > 255) {
            const task = new BatchTask(world, pos, count, type, nbt, undefined, total => {
                ctx.source.outPut.sendMessage(`Success summon \x1b[32m${total}\x1b[0m "${type}"`);
            });
            task.start();
            return;
        }

        try {
            for (let i = 0; i < count; i++) {
                const entity = type.create(world) as Entity;

                if (nbt) {
                    const compound = nbt.copy();
                    entity.readNBT(compound);
                }

                entity.setPositionByVec(pos);
                world.addEntity(entity);
            }
            ctx.source.outPut.sendMessage(`Success summon ${type}`);
        } catch (error) {
            if (error instanceof IllegalArgumentError || error instanceof IllegalStateError) {
                throw error;
            }
            throw new CommandError(`\x1b[33mFail to summon entity`);
        }
    }
}

class BatchTask {
    private readonly world: World;
    private readonly pos: Vec2;
    private readonly total: number;
    private readonly type: EntityType<any>;
    private readonly nbt?: NbtCompound;
    private readonly step: number;
    private readonly onDone?: Consumer<number>;

    private completed: number = 0;
    private task?: number;

    public constructor(
        world: World,
        pos: Vec2,
        total: number,
        type: EntityType<any>,
        nbt?: NbtCompound,
        step?: number,
        onDone?: Consumer<number>,
    ) {
        this.world = world;
        this.pos = pos;
        this.total = total;
        this.type = type;
        this.nbt = nbt;
        this.step = step ?? 255;
        this.onDone = onDone;
        this.spawn = this.spawn.bind(this);
    }

    public start() {
        clearTimeout(this.task);
        this.spawn();
    }

    private spawn() {
        const {world, type, pos, nbt, step} = this;
        const count = Math.min(this.total - this.completed, step);

        for (let i = 0; i < count; i++) {
            const entity = type.create(world) as Entity;

            if (nbt) {
                const compound = nbt.copy();
                entity.readNBT(compound);
            }

            entity.setPositionByVec(pos);
            world.addEntity(entity);
        }

        this.completed += count;
        if (this.completed >= this.total) {
            clearTimeout(this.task);
            this.onDone?.(this.completed);
            return;
        }

        this.task = setTimeout(this.spawn, 200);
    }

    public cancel() {
        clearTimeout(this.task);
    }
}