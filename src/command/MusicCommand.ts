import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import {Identifier} from "../registry/Identifier.ts";
import {AudioManager} from "../sound/AudioManager.ts";
import {Registries} from "../registry/Registries.ts";
import {BGMManager} from "../sound/BGMManager.ts";
import {argument, literal} from "../brigadier/builder/CommandNodeBuilder.ts";
import type {ClientCommandSource} from "../client/command/ClientCommandSource.ts";
import {CommandError} from "../apis/errors.ts";
import {IdentifierArgumentType} from "./argument/IdentifierArgumentType.ts";
import {CommandUtil} from "./CommandUtil.ts";

export class MusicCommand {
    public static registry<T extends ClientCommandSource>(dispatcher: CommandDispatcher<T>) {
        dispatcher.registry(
            literal<T>('music')
                .then(
                    literal<T>('play')
                        .then(
                            argument<T, Identifier>('music_id', IdentifierArgumentType.identifier())
                                .executes(ctx => {
                                    const arg = ctx.args.get('music_id');
                                    if (!arg) throw new CommandError("\x1b[33m<music_id> is required");

                                    const event = Registries.AUDIOS.getById(arg.result);
                                    if (!event) {
                                        throw new CommandError(`\x1b[33mMusic was not found with ID: "${arg.result}"`, 'warning');
                                    }
                                    AudioManager.playAudio(event);
                                    ctx.source.addMessage(`Start to play \x1b[32m"${event.getId()}"\x1b[0m`);
                                })
                                .suggests(CommandUtil.createIdentifierSuggestion(Registries.AUDIOS))
                        )
                )
                .then(
                    literal<T>('pause')
                        .executes(() => {
                            AudioManager.pause();
                        })
                )
                .then(
                    literal<T>('resum')
                        .executes(() => {
                            AudioManager.resume();
                        })
                )
                .then(
                    literal<T>('stop')
                        .executes(() => {
                            AudioManager.stop();
                        })
                )
                .then(
                    literal<T>('next')
                        .executes(() => {
                            BGMManager.next();
                        })
                )
        );
    }
}