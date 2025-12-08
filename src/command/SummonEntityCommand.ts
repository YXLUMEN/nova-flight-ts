import type {ServerCommandSource} from "../server/command/ServerCommandSource.ts";
import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import {argument, literal} from "../brigadier/builder/CommandNodeBuilder.ts";
import type {Identifier} from "../registry/Identifier.ts";
import {IdentifierArgumentType} from "./argument/IdentifierArgumentType.ts";
import {CommandUtil} from "./CommandUtil.ts";
import {Registries} from "../registry/Registries.ts";
import {CommandError, IllegalArgumentError} from "../apis/errors.ts";
import type {Entity} from "../entity/Entity.ts";
import type {PosArgument} from "./argument/PosArgument.ts";
import {PosArgumentType} from "./argument/PosArgumentType.ts";
import type {CommandContext} from "../brigadier/context/CommandContext.ts";
import {EntityTypes} from "../entity/EntityTypes.ts";
import type {IVec} from "../utils/math/IVec.ts";
import {IntArgumentType} from "./argument/IntArgumentType.ts";
import type {EntityType} from "../entity/EntityType.ts";

export class SummonEntityCommand {
    public static registry<T extends ServerCommandSource>(dispatcher: CommandDispatcher<T>) {
        dispatcher.registry(
            literal<T>('summon')
                .then(
                    argument<T, Identifier>('entity', IdentifierArgumentType.identifier())
                        .executes(this.summonEntity.bind(this))
                        .suggests(CommandUtil.createIdentifierSuggestion(Registries.ENTITY_TYPE))
                        .then(
                            argument<T, PosArgument>('pos', PosArgumentType.pos())
                                .executes(this.summonEntity.bind(this))
                                .then(
                                    argument<T, number>('count', IntArgumentType.int())
                                        .executes(this.summonEntity.bind(this))
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
            throw new Error('Cannot summon a player');
        }

        const countArg = ctx.args.get('count');
        if (countArg) {
            this.summonBatch(countArg.result, type, ctx);
            return;
        }

        try {
            const world = ctx.source.getWorld()!;
            const entity = type.create(world) as Entity;
            entity.setPositionByVec(this.getSpawnPos(ctx));
            world.addEntity(entity);
            ctx.source.outPut.sendMessage(`Success summon ${type.toString()}`);
        } catch (error) {
            console.warn(error);
            throw new CommandError(`\x1b[33mFail to summon entity`);
        }
    }

    private static getSpawnPos<T extends ServerCommandSource>(ctx: CommandContext<T>): IVec {
        const arg = ctx.args.get('pos');
        if (!arg) return ctx.source.position;

        const posArg = arg.result as PosArgument;
        return posArg.toAbsolutePos(ctx.source);
    }

    private static summonBatch<T extends ServerCommandSource>(count: number, type: EntityType<any>, ctx: CommandContext<T>) {
        if (count <= 0 || count > 255) throw new IllegalArgumentError('Summon count should in [1-255]');

        const world = ctx.source.getWorld()!;
        const pos = this.getSpawnPos(ctx);

        try {
            for (let i = 0; i < count; i++) {
                const entity = type.create(world) as Entity;
                entity.setPositionByVec(pos);
                world.addEntity(entity);
            }
            ctx.source.outPut.sendMessage(`Success summon ${type.toString()}`);
        } catch (error) {
            throw new CommandError(`\x1b[33mFail to summon entity`);
        }
    }
}