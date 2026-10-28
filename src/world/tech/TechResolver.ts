import type {RawTech} from "../../type/ITech.ts";
import {isNonEmptyString} from "../../utils/util.ts";
import {TechBuilder} from "./TechBuilder.ts";

export abstract class TechResolver {
    protected readonly techUrl: string;
    protected readonly configUrl: string;
    protected readonly out: Map<string, TechBuilder> = new Map();
    protected rawTech: unknown[] | null = null;
    protected config: any | null = null;

    protected constructor(techUrl: string, configUrl: string) {
        this.techUrl = techUrl;
        this.configUrl = configUrl;
    }

    public abstract load(): Promise<void>;

    public abstract normalize(): Map<string, TechBuilder>;

    protected setTech(tech: unknown, config: unknown) {
        if (!Array.isArray(tech)) {
            throw new Error('Tech JSON must be an array');
        }
        this.rawTech = tech;

        if (config == null) {
            this.config = {};
        } else {
            if (typeof config !== 'object' || Array.isArray(config)) throw new Error('Invalid tech config');
            this.config = config;
        }
    }

    protected buildGeneral(tech: RawTech, builder: TechBuilder) {
        if (!isNonEmptyString(tech['id'])) {
            throw new Error(`'id' is required and must be a non-empty string`);
        }

        const id = tech['id'].trim();
        if (this.out.has(id)) {
            throw new Error(`Duplicate tech id: '${id}'`);
        }

        const name = isNonEmptyString(tech['name']) ? tech['name'].trim() : id;

        const cost = tech['cost'];
        if (typeof cost !== 'number' || !Number.isFinite(cost)) {
            throw new Error(`invalid cost '${tech.cost}'`);
        }

        const requires = Array.isArray(tech['requires']) ? tech['requires'] : null;
        const conflicts = Array.isArray(tech['conflicts']) ? tech['conflicts'] : null;
        const branchGroup = isNonEmptyString(tech['branchGroup']) ? tech['branchGroup'].trim() : null;

        builder
            .name(name)
            .cost(cost)
            .requires(requires)
            .conflicts(conflicts)
            .branchGroup(branchGroup);
        return id;
    }
}