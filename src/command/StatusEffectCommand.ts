import type {ServerCommandSource} from "../server/command/ServerCommandSource.ts";
import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import {argument, literal} from "../brigadier/CommandNodeBuilder.ts";
import type {StringReader} from "../brigadier/StringReader.ts";
import {CommandError, IllegalArgumentError} from "../apis/errors.ts";
import {Identifier} from "../registry/Identifier.ts";
import {Registries} from "../registry/Registries.ts";
import {EntitySelector} from "../utils/EntitySelector.ts";
import {LivingEntity} from "../entity/LivingEntity.ts";
import {StatusEffectInstance} from "../entity/effect/StatusEffectInstance.ts";
import type {CommandContext} from "../brigadier/context/CommandContext.ts";

export class StatusEffectCommand {
    public static registry<T extends ServerCommandSource>(dispatcher: CommandDispatcher<T>) {
        dispatcher.registry(
            literal<T>('effect')
                .then(
                    literal<T>('give')
                        .then(
                            argument<T, string>('selector', {
                                parse(reader: StringReader): string {
                                    const mod = reader.readUnquotedString();
                                    if (EntitySelector.isValidateSelector(mod)) {
                                        return mod;
                                    }
                                    throw new IllegalArgumentError(`\x1b[31mUnknown selector ${mod}`);
                                }
                            })
                                .then(
                                    argument<T, Identifier>('effect_id', {
                                        parse(reader: StringReader): Identifier {
                                            return Identifier.tryParse(reader.readUnquotedString())!;
                                        }
                                    })
                                        .executes(ctx => this.applyEffect(ctx))
                                        .then(
                                            argument<T, number>('duration', {
                                                parse(reader: StringReader): number {
                                                    return reader.readInt();
                                                }
                                            })
                                                .executes(ctx => this.applyEffect(ctx))
                                                .then(
                                                    argument<T, number>('amplifier', {
                                                        parse(reader: StringReader): number {
                                                            return reader.readInt();
                                                        }
                                                    })
                                                        .executes(ctx => this.applyEffect(ctx))
                                                )
                                        )
                                )
                        )
                )
                .then(
                    literal<T>('clear')
                        .executes(ctx => this.removeStatus(ctx))
                        .then(
                            argument<T, string>('selector', {
                                parse(reader: StringReader): string {
                                    const mod = reader.readUnquotedString();
                                    if (EntitySelector.isValidateSelector(mod)) {
                                        return mod;
                                    }
                                    throw new IllegalArgumentError(`\x1b[31mUnknown selector ${mod}`);
                                }
                            })
                                .executes(ctx => this.removeStatus(ctx))
                                .then(
                                    argument<T, Identifier>('effect_id', {
                                        parse(reader: StringReader): Identifier {
                                            return Identifier.tryParse(reader.readUnquotedString())!;
                                        }
                                    }).executes(ctx => this.removeStatus(ctx))
                                )
                        )
                )
        );
    }

    private static applyEffect<T extends ServerCommandSource>(ctx: CommandContext<T>) {
        const effectIdResult = ctx.args.get('effect_id');
        if (!effectIdResult) throw new CommandError("\x1b[33m<effect_id> is required");

        const selectorResult = ctx.args.get('selector');
        if (!selectorResult) throw new CommandError("\x1b[33m<selector> is required");

        const durationResult = ctx.args.get('duration');
        const amplifierResult = ctx.args.get('amplifier');

        const duration = durationResult ? Number(durationResult.result) : 10;
        if (!Number.isSafeInteger(duration) || duration < -1) {
            throw new IllegalArgumentError("\x1b[31mExpected a <duration> to be integer and not smaller than -1");
        }

        const amplifier = amplifierResult ? Number(amplifierResult.result) : 0;
        if (!Number.isSafeInteger(amplifier) || amplifier < 0 || amplifier > 255) {
            throw new IllegalArgumentError("\x1b[31mExpected a <amplifier> must in [0,255]");
        }

        const effect = Registries.STATUS_EFFECT.getEntryById(effectIdResult.result);
        if (!effect) {
            throw new CommandError(`\x1b[33mEffect not found with id ${effectIdResult.result}`, 'warning');
        }

        const entities = EntitySelector.parse(selectorResult.result, ctx.source);
        if (!entities) {
            throw new Error(`\x1b[33mTarget not found}`);
        }

        for (const entity of entities) {
            if (entity instanceof LivingEntity) {
                entity.addStatusEffect(new StatusEffectInstance(effect, duration, amplifier), null);
                ctx.source.outPut.sendMessage(`\x1b[32mGive effect ${effectIdResult.result} to ${entity.getUuid()}`);
            }
        }
    }

    private static removeStatus<T extends ServerCommandSource>(ctx: CommandContext<T>) {
        const selectorResult = ctx.args.get('selector');
        const selector = selectorResult ? selectorResult.result : '@s';

        const entities = EntitySelector.parse(selector, ctx.source);
        if (!entities) {
            throw new Error(`\x1b[33mTarget not found`);
        }

        const effectIdResult = ctx.args.get('effect_id');
        if (!effectIdResult) {
            for (const entity of entities) {
                if (entity instanceof LivingEntity) {
                    entity.clearStatuesEffects();
                }
            }
            return;
        }

        const effect = Registries.STATUS_EFFECT.getEntryById(effectIdResult.result);
        if (!effect) {
            throw new CommandError(`\x1b[33mEffect not found with id ${effectIdResult.result}`, 'warning');
        }

        for (const entity of entities) {
            if (entity instanceof LivingEntity) {
                entity.removeStatusEffect(effect);
                ctx.source.outPut.sendMessage(`\x1b[32mRemove effect ${effectIdResult.result} on ${entity.getUuid()}`);
            }
        }
    }
}