import type {ServerCommandSource} from "../server/command/ServerCommandSource.ts";
import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import {argument, literal} from "../brigadier/builder/CommandNodeBuilder.ts";
import {CommandError, IllegalArgumentError} from "../apis/errors.ts";
import {Identifier} from "../registry/Identifier.ts";
import {Registries} from "../registry/Registries.ts";
import {LivingEntity} from "../entity/LivingEntity.ts";
import {StatusEffectInstance} from "../entity/effect/StatusEffectInstance.ts";
import type {CommandContext} from "../brigadier/context/CommandContext.ts";
import {EntitySelectorArgumentType} from "./argument/EntitySelectorArgumentType.ts";
import {IdentifierArgumentType} from "./argument/IdentifierArgumentType.ts";
import {IntArgumentType} from "./argument/IntArgumentType.ts";
import {EntitySelector} from "./EntitySelector.ts";
import {CommandUtil} from "./CommandUtil.ts";

export class StatusEffectCommand {
    public static registry<T extends ServerCommandSource>(dispatcher: CommandDispatcher<T>) {
        dispatcher.registry(
            literal<T>('effect')
                .then(
                    literal<T>('give')
                        .then(
                            argument<T, EntitySelector>('selector', EntitySelectorArgumentType.selector())
                                .then(
                                    argument<T, Identifier>('effect_id', IdentifierArgumentType.identifier())
                                        .executes(ctx => this.applyEffect(ctx))
                                        .suggests(CommandUtil.createIdentifierSuggestion(Registries.STATUS_EFFECT))
                                        .then(
                                            argument<T, number>('duration', IntArgumentType.int())
                                                .executes(ctx => this.applyEffect(ctx))
                                                .then(
                                                    argument<T, number>('amplifier', IntArgumentType.int())
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
                            argument<T, EntitySelector>('selector', EntitySelectorArgumentType.selector())
                                .executes(ctx => this.removeStatus(ctx))
                                .then(
                                    argument<T, Identifier>('effect_id', IdentifierArgumentType.identifier())
                                        .executes(ctx => this.removeStatus(ctx))
                                        .suggests(CommandUtil.createIdentifierSuggestion(Registries.STATUS_EFFECT))
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
        const selector = selectorResult.result;
        if (!(selector instanceof EntitySelector)) {
            throw new CommandError('');
        }

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

        let count = 0;
        const entities = selector.getEntities(ctx.source);
        for (const entity of entities) {
            if (entity instanceof LivingEntity) {
                count++;
                entity.addStatusEffect(new StatusEffectInstance(effect, duration, amplifier), null);
                ctx.source.outPut.sendMessage(`Give effect ${effectIdResult.result} to \x1b[32m${entity.getUUID()}`);
            }
        }

        if (count === 0) {
            throw new Error(`\x1b[33mTarget not found`);
        }
    }

    private static removeStatus<T extends ServerCommandSource>(ctx: CommandContext<T>) {
        const selectorResult = ctx.args.get('selector');
        if (!selectorResult) {
            const target = ctx.source.entity;
            if (target instanceof LivingEntity) {
                target.clearStatuesEffects();
            }
            return;
        }

        const selector = selectorResult.result;
        if (!(selector instanceof EntitySelector)) {
            throw new CommandError('');
        }

        let count = 0;
        const entities = selector.getEntities(ctx.source);
        const effectIdResult = ctx.args.get('effect_id');
        if (!effectIdResult) {
            for (const entity of entities) {
                if (entity instanceof LivingEntity) {
                    entity.clearStatuesEffects();
                }
            }
            if (count === 0) {
                throw new CommandError(`\x1b[33mTarget not found`, 'warning');
            }
            return;
        }

        const effect = Registries.STATUS_EFFECT.getEntryById(effectIdResult.result);
        if (!effect) {
            throw new CommandError(`\x1b[33mEffect not found with id ${effectIdResult.result}`, 'warning');
        }

        for (const entity of entities) {
            if (entity instanceof LivingEntity) {
                count++;
                entity.removeStatusEffect(effect);
                ctx.source.outPut.sendMessage(`Remove effect ${effectIdResult.result} on \x1b[32m${entity.getUUID()}`);
            }
        }
        if (count === 0) {
            throw new CommandError(`\x1b[33mTarget not found`, 'warning');
        }
    }
}