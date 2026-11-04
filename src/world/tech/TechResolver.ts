import type {RawTech} from "../../type/ITech.ts";
import type {RecordManager} from "../../database/data/RecordManager.ts";
import {isNonEmptyString} from "../../utils/util.ts";
import {TechBuilder} from "./TechBuilder.ts";
import {RecordTypes} from "../../database/data/RecordTypes.ts";

export class TechResolver {
    protected readonly out: Map<string, TechBuilder> = new Map();
    protected rawTech: unknown[] | null = null;

    public async load(data: RecordManager): Promise<void> {
        const buffer = (await data.getValue(RecordTypes.TECH)).unwrap();
        const json = new TextDecoder('utf-8', {fatal: true}).decode(buffer);
        const tech = JSON.parse(json);

        if (!Array.isArray(tech)) throw new Error('Tech JSON must be an array');
        this.rawTech = tech;
    }

    public normalize(): Map<string, TechBuilder> {
        if (!this.rawTech) throw new Error('None tech was found');

        const raw = this.rawTech;
        const out = this.out;

        for (let i = 0; i < raw.length; i++) {
            const item = raw[i];
            if (item == null || typeof item !== 'object') {
                throw new Error(`Tech[${i}] must be an object`);
            }

            const rawTech = item as RawTech;
            const builder = new TechBuilder();
            const id = this.build(rawTech, builder);
            out.set(id, builder);
        }

        return out;
    }

    protected build(tech: RawTech, builder: TechBuilder): string {
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