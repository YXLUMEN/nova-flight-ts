import type {RawTech} from "../../type/ITech.ts";
import {TechResolver} from "../../world/tech/TechResolver.ts";
import {TechBuilder} from "../../world/tech/TechBuilder.ts";
import {WorkerFS} from "../../worker/fs.ts";

export class ServerTechResolver extends TechResolver {
    public constructor(techUrl: string, configUrl: string) {
        super(techUrl, configUrl);
    }

    public async load(): Promise<void> {
        const tech = await this.fetch(this.techUrl);
        this.setTech(tech, null);
    }

    public normalize(): Map<string, TechBuilder> {
        if (!this.rawTech) throw new Error('None tech was found');

        const raw = this.rawTech;
        for (let i = 0; i < raw.length; i++) {
            const item = raw[i];
            if (item == null || typeof item !== 'object') {
                throw new Error(`Tech[${i}] must be an object`);
            }

            const rawTech = item as RawTech;
            const builder = new TechBuilder();
            const id = this.buildGeneral(rawTech, builder);
            this.out.set(id, builder);
        }

        return this.out;
    }

    private async fetch(filePath: string) {
        const buffer = await WorkerFS.fetch(filePath);
        if (!buffer) throw new Error('Failed to load tech data');
        const json = new TextDecoder('utf-8', {fatal: true}).decode(buffer);
        return JSON.parse(json);
    }
}