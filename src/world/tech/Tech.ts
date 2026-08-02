import {Identifier} from "../../registry/Identifier.ts";
import {Registries} from "../../registry/Registries.ts";
import {PacketCodecs} from "../../network/codec/PacketCodecs.ts";
import type {TranslatableText} from "../../i18n/TranslatableText.ts";

export class Tech {
    public static readonly PACKET_CODEC = PacketCodecs.registryEntry(Registries.TECH);

    public readonly name: TranslatableText
    public readonly cost: number;

    private readonly requireTechs: Set<string | Tech> | null;
    private readonly conflictTechs: Set<string | Tech> | null;
    public readonly branchGroup: string | null;

    public constructor(
        name: TranslatableText,
        cost: number,
        requires: Iterable<string> | null,
        conflicts: Iterable<string> | null,
        branchGroup: string | null,
    ) {
        this.name = name;
        this.cost = cost;
        this.requireTechs = requires !== null ? new Set(requires) : null;
        this.conflictTechs = conflicts !== null ? new Set(conflicts) : null;
        this.branchGroup = branchGroup;
    }

    public get requires() {
        return this.requireTechs as Set<Tech> | null;
    }

    public get conflicts() {
        return this.conflictTechs as Set<Tech> | null;
    }

    public complete() {
        if (this.requireTechs &&
            this.requireTechs.size > 0 &&
            this.requireTechs.values().every(tech => typeof tech === 'string')
        ) {
            const parsed = this.parseTechs(this.requireTechs as Set<string>);
            this.requireTechs.clear();
            parsed.forEach(item => this.requireTechs!.add(item));
        }

        if (this.conflictTechs &&
            this.conflictTechs.size > 0 &&
            this.conflictTechs.values().every(tech => typeof tech === 'string')
        ) {
            const parsed = this.parseTechs(this.conflictTechs as Set<string>);
            this.conflictTechs.clear();
            this.conflictTechs.union(parsed);
            parsed.forEach(item => this.conflictTechs!.add(item));
        }
    }

    protected parseTechs(techs: Set<string>): Set<Tech> {
        const parsed: Set<Tech> = new Set();
        for (const require of techs) {
            const id = Identifier.tryParse(require);
            if (!id) throw new Error(`Tech "${this.name}"'s require ${require} can not parse`);

            const tech = Registries.TECH.getById(id);
            if (!tech) throw new Error(`Tech "${this.name}"'s require ${require} does not exist`);
            parsed.add(tech);
        }
        return parsed;
    }
}