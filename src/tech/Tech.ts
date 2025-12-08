import {clamp} from "../utils/math/math.ts";
import {Identifier} from "../registry/Identifier.ts";
import {Registries} from "../registry/Registries.ts";
import {PacketCodecs} from "../network/codec/PacketCodecs.ts";

export class Tech {
    public static readonly PACKET_CODEC = PacketCodecs.registryEntry(Registries.TECH);

    public readonly name: string;
    public readonly desc: string;
    public readonly cost: number;

    public readonly x: number;
    public readonly y: number;

    private readonly requireTechs: Set<string | Tech> | null;
    private readonly conflictTechs: Set<string | Tech> | null;
    public readonly branchGroup: string | null;

    public constructor(
        name: string,
        desc: string,
        cost: number,
        x: number,
        y: number,
        requires: Iterable<string> | null,
        conflicts: Iterable<string> | null,
        branchGroup: string | null,
    ) {
        this.name = name;
        this.desc = desc;
        this.cost = cost;
        this.x = x;
        this.y = y;
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

    private parseTechs(techs: Set<string>): Set<Tech> {
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

    public static create() {
        return new this.Builder();
    }

    public static readonly Builder = class Builder {
        private _name: string = 'unknown';
        private _desc: string = '';
        private _cost: number = 0;

        private _x: number = 0;
        private _y: number = 0;

        private _requires: string[] | null = null;
        private _conflicts: string[] | null = null;
        private _branchGroup: string | null = null;

        public name(name: string) {
            this._name = name;
            return this;
        }

        public desc(desc: string) {
            this._desc = desc;
            return this;
        }

        public cost(cost: number) {
            this._cost = clamp(cost, 0, 65535) | 0;
            return this;
        }

        public costUnclamp(cost: number) {
            this._cost = cost | 0;
            return this;
        }

        public x(x: number) {
            this._x = x;
            return this;
        }

        public y(y: number) {
            this._y = y;
            return this;
        }

        public requires(requires: string[] | null) {
            this._requires = requires;
            return this;
        }

        public conflicts(conflicts: string[] | null) {
            this._conflicts = conflicts;
            return this;
        }

        public branchGroup(branchGroup: string | null) {
            this._branchGroup = branchGroup;
            return this;
        }

        public build() {
            return new Tech(
                this._name,
                this._desc,
                this._cost,
                this._x,
                this._y,
                this._requires,
                this._conflicts,
                this._branchGroup
            );
        }
    }
}