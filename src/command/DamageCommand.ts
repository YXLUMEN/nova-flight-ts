import type {ServerCommandSource} from "../server/command/ServerCommandSource.ts";
import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import {argument, literal} from "../brigadier/builder/CommandNodeBuilder.ts";
import {EntitySelector} from "./EntitySelector.ts";
import {EntitySelectorArgumentType} from "./argument/EntitySelectorArgumentType.ts";
import {CommandError} from "../type/errors.ts";
import {DoubleArgumentType} from "./argument/DoubleArgumentType.ts";

export class DamageCommand {
    public static registry<T extends ServerCommandSource>(dispatcher: CommandDispatcher<T>) {
        dispatcher.registry(
            literal<T>('damage')
                .then(
                    argument<T, EntitySelector>('selector', EntitySelectorArgumentType.entities())
                        .then(
                            argument<T, number>('amount', DoubleArgumentType.double())
                                .executes(ctx => {
                                    const world = ctx.source.getWorld();
                                    if (!world) throw new CommandError("No world was found.");
                                    if (world.isClient) return;

                                    const selectorResult = ctx.args.get('selector');
                                    if (!selectorResult) throw new CommandError("\x1b[33m<selector> is required");

                                    const selector = selectorResult.result;
                                    if (!(selector instanceof EntitySelector)) {
                                        throw new CommandError('Not a entity selector');
                                    }

                                    const damageResult = ctx.args.get('amount');
                                    if (!damageResult) throw new CommandError("\x1b[33m<amount> is required");

                                    const damage = Number(damageResult.result);
                                    if (!Number.isFinite(damage)) {
                                        throw new CommandError("Invalid amount");
                                    }

                                    let count = 0;
                                    const entities = selector.getEntities(ctx.source);
                                    const source = world.getDamageSources().generic();
                                    for (const entity of entities) {
                                        if (!entity) continue;
                                        count++;
                                        entity.takeDamage(source, damage);
                                    }

                                    if (count === 0) {
                                        throw new CommandError('\x1b[33mNo target founded.');
                                    }

                                    ctx.source.outPut.sendMessage(`Apply ${damage} to ${count} entities`);
                                })
                                .requires(source => source.hasPermissionLevel(6))
                        )
                )
        );
    }
}