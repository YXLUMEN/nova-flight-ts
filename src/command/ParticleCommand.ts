import type {ClientCommandSource} from "../client/command/ClientCommandSource.ts";
import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import type {CommandContext} from "../brigadier/context/CommandContext.ts";
import type {ClientWorld} from "../client/ClientWorld.ts";
import type {Identifier} from "../registry/Identifier.ts";
import {argument, literal} from "../brigadier/builder/CommandNodeBuilder.ts";
import {IdentifierArgumentType} from "./argument/IdentifierArgumentType.ts";
import {CommandUtil} from "./CommandUtil.ts";
import {Registries} from "../registry/Registries.ts";
import {CommandError} from "../type/errors.ts";
import {IntArgumentType} from "./argument/IntArgumentType.ts";

export class ParticleCommand {
    public static registry<T extends ClientCommandSource>(dispatcher: CommandDispatcher<T>) {
        const summon = this.summon.bind(this);

        dispatcher.registry(
            literal<T>('particle')
                .then(
                    argument<T, Identifier>('particle_id', IdentifierArgumentType.identifier())
                        .executes(summon)
                        .suggests(CommandUtil.createIdentifierSuggestion(Registries.PARTICLES))
                        .then(
                            argument<T, number>('count', IntArgumentType.int())
                                .executes(summon)
                        )
                )
        );
    }

    private static summon<T extends ClientCommandSource>(ctx: CommandContext<T>) {
        const world = ctx.source.getWorld() as ClientWorld | null;
        if (!world) return;

        const particleId = CommandUtil.assert<T, Identifier>(ctx, 'particle_id');
        const particleType = Registries.PARTICLES.getById(particleId);
        if (!particleType) throw new CommandError(`Particle type ${particleId} is not registered`);

        const count = ctx.args.get('count')?.result;
        const pos = ctx.source.getClient().input.getWorldPointer();
        world.addParticleVec(particleType, pos, count ?? 1);
    }
}