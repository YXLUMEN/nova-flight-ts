import type {ClientCommandSource} from "../client/command/ClientCommandSource.ts";
import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import {argument, literal} from "../brigadier/builder/CommandNodeBuilder.ts";
import type {Identifier} from "../registry/Identifier.ts";
import {IdentifierArgumentType} from "./argument/IdentifierArgumentType.ts";
import {CommandError} from "../type/errors.ts";
import {Registries} from "../registry/Registries.ts";
import {CommandUtil} from "./CommandUtil.ts";

export class SoundCommand {
    public static registry<T extends ClientCommandSource>(dispatcher: CommandDispatcher<T>) {
        dispatcher.registry(
            literal<T>('sound')
                .then(
                    argument<T, Identifier>('sound', IdentifierArgumentType.identifier())
                        .executes(ctx => {
                            const arg = ctx.args.get('sound');
                            if (!arg) throw new CommandError("\x1b[33m<sound> is required");

                            const event = Registries.SOUND_EVENT.getById(arg.result);
                            if (!event) {
                                throw new CommandError(`\x1b[33mSound was not found with ID: "${arg.result}"`);
                            }

                            ctx.source.getClient().globalSound.playSound(event);
                            ctx.source.addMessage(`Start to play \x1b[32m"${event.id}"\x1b[0m`);
                        })
                        .suggests(CommandUtil.createIdentifierSuggestion(Registries.SOUND_EVENT))
                )
        );
    }
}