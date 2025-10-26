import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import type {StringReader} from "../brigadier/StringReader.ts";
import {Identifier} from "../registry/Identifier.ts";
import {AudioManager} from "../sound/AudioManager.ts";
import {Registries} from "../registry/Registries.ts";
import {BGMManager} from "../sound/BGMManager.ts";
import {argument, literal} from "../brigadier/CommandNodeBuilder.ts";

export function musicRegistry(dispatcher: CommandDispatcher<any>) {
    dispatcher.registry(
        literal('music')
            .then(
                literal('play')
                    .then(
                        argument<any, Identifier>('music_id', {
                            parse(reader: StringReader): Identifier {
                                reader.skipWhitespace();
                                return Identifier.tryParse(reader.readUnquotedString())!;
                            }
                        })
                            .executes(ctx => {
                                const arg = ctx.args.get('music_id');
                                if (!arg) throw new Error("<music_id> is required");

                                const event = Registries.AUDIOS.getById(arg.result);
                                if (!event) throw new Error(`Music was not found with ID: "${arg.result}"`);
                                AudioManager.playAudio(event);
                            })
                    )
            )
            .then(
                literal('pause')
                    .executes(() => {
                        AudioManager.pause();
                    })
            )
            .then(
                literal('resum')
                    .executes(() => {
                        AudioManager.resume();
                    })
            )
            .then(
                literal('next')
                    .executes(() => {
                        BGMManager.next();
                    })
            )
    );
}