import type {ServerCommandSource} from "../server/command/ServerCommandSource.ts";
import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import type {CommandContext} from "../brigadier/context/CommandContext.ts";
import type {Identifier} from "../registry/Identifier.ts";
import type {World} from "../world/World.ts";
import type {PosArgument} from "./argument/PosArgument.ts";
import {argument, literal} from "../brigadier/builder/CommandNodeBuilder.ts";
import {EntitySelector} from "./EntitySelector.ts";
import {EntitySelectorArgumentType} from "./argument/EntitySelectorArgumentType.ts";
import {CommandError, IllegalArgumentError} from "../type/errors.ts";
import {DoubleArgumentType} from "./argument/DoubleArgumentType.ts";
import {IdentifierArgumentType} from "./argument/IdentifierArgumentType.ts";
import {CommandUtil} from "./CommandUtil.ts";
import {Registries} from "../registry/Registries.ts";
import {PosArgumentType} from "./argument/PosArgumentType.ts";
import {DamageSource} from "../entity/damage/DamageSource.ts";

export class DamageCommand {
    public static registry<T extends ServerCommandSource>(dispatcher: CommandDispatcher<T>) {
        dispatcher.registry(
            literal<T>('damage')
                .then(
                    argument<T, EntitySelector>('selector', EntitySelectorArgumentType.entities())
                        .then(
                            argument<T, number>('amount', DoubleArgumentType.double())
                                .executes(this.damage)
                                .then(
                                    argument<T, Identifier>('damage_type', IdentifierArgumentType.identifier())
                                        .executes(this.damage)
                                        .suggests(CommandUtil.createIdentifierSuggestion(Registries.DAMAGE_TYPE))
                                        .then(
                                            literal<T>('at')
                                                .then(
                                                    argument<T, PosArgument>('pos', PosArgumentType.pos())
                                                        .executes(this.damage)
                                                )
                                        )
                                        .then(
                                            literal<T>('by')
                                                .then(
                                                    argument<T, EntitySelector>('attacker', EntitySelectorArgumentType.entity())
                                                        .executes(this.damage)
                                                )
                                        )
                                )
                        )
                )
                .requires(source => source.hasPermissionLevel(6))
        );
    }

    private static damage<T extends ServerCommandSource>(ctx: CommandContext<T>) {
        const world = CommandUtil.assertWorld(ctx);
        if (world.isClient) return;

        const selector = CommandUtil.assertSelector(ctx, 'selector');

        const damage = CommandUtil.assert(ctx, 'amount', Number);
        if (!Number.isFinite(damage)) throw new CommandError("Invalid amount");

        let count = 0;
        const entities = selector.getEntities(ctx.source);
        const source = DamageCommand.createSource(ctx, world);
        for (const entity of entities) {
            if (!entity) continue;
            count++;
            entity.takeDamage(source, damage);
        }

        if (count === 0) {
            throw new CommandError('\x1b[33mNo target founded.');
        }

        ctx.source.outPut.sendMessage(`Apply ${damage} to ${count} entities`);
    }

    private static createSource<T extends ServerCommandSource>(ctx: CommandContext<T>, world: World) {
        const result = ctx.args.get('damage_type');
        if (result?.result === undefined) {
            return world.getDamageSources().generic();
        }

        const type = Registries.DAMAGE_TYPE.getEntryById(result.result);
        if (type === null) {
            throw new IllegalArgumentError();
        }

        const pos = ctx.args.get('pos')?.result as PosArgument | undefined;
        if (pos !== undefined) {
            return new DamageSource(type, undefined, undefined, pos.toAbsolutePos(ctx.source));
        }

        const entitySelector = ctx.args.get('attacker')?.result as EntitySelector | undefined;
        if (entitySelector !== undefined) {
            const attacker = entitySelector.getEntity(ctx.source);
            return new DamageSource(type, attacker);
        }

        return new DamageSource(type);
    }
}