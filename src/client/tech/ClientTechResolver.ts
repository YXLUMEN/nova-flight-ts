import type {RawTech} from "../../type/ITech.ts";
import type {RecordManager} from "../../database/data/RecordManager.ts";
import type {TechBuilder} from "../../world/tech/TechBuilder.ts";
import {isNonEmptyString} from "../../utils/Strings.ts";
import {encodeColorHex} from "../../utils/net_util.ts";
import {assert} from "../../utils/dom_util.ts";
import {TechResolver} from "../../world/tech/TechResolver.ts";
import {ClientTechBuilder} from "./ClientTechBuilder.ts";
import {TechLayoutParser} from "./TechLayoutParser.ts";

export class ClientTechResolver extends TechResolver {
    private readonly shellId: string;
    private config: any;

    public constructor(shellId: string) {
        super();
        this.shellId = shellId;
    }

    public override async load(data: RecordManager): Promise<void> {
        await super.load(data);

        const resp = await fetch('./data/tech/tech-config.json');
        const config = await resp.json();
        if (config == null) {
            this.config = {};
        } else {
            if (typeof config !== 'object' || Array.isArray(config)) throw new Error('Invalid tech config');
            this.config = config;
        }
    }

    public override normalize(): Map<string, TechBuilder> {
        if (!this.rawTech) throw new Error('None tech was found');

        const raw = this.rawTech;
        const out = this.out;

        const ele = document.getElementById(this.shellId)!;
        ele.classList.remove('hidden');
        const box = assert(ele, '#viewport')!.getBoundingClientRect();
        const x = Math.floor(box.width / 2);
        const y = Math.floor(80);
        ele.classList.add('hidden');

        const parser = new TechLayoutParser(x, y, 180, 80);
        const color = this.config.branch_color ?? {};

        for (let i = 0; i < raw.length; i++) {
            const item = raw[i];
            if (item == null || typeof item !== 'object') {
                throw new Error(`Tech[${i}] must be an object`);
            }

            const rawTech = item as RawTech;
            const builder = new ClientTechBuilder();
            const id = this.build(rawTech, builder);
            this.buildClient(rawTech, builder, parser, color);
            out.set(id, builder);
        }

        return out;
    }

    private buildClient(tech: RawTech, builder: ClientTechBuilder, parser: TechLayoutParser, colors: Record<string, string>) {
        const x = tech['x'];
        const y = tech['y'];
        if (typeof x !== 'number' || !Number.isFinite(x) || typeof y !== 'number' || !Number.isFinite(y)) {
            throw new Error(`Invalid position (${tech.x}, ${tech.y})`);
        }

        const desc = isNonEmptyString(tech['desc']) ? tech['desc'].trim() : '';
        const drawLine = Array.isArray(tech['drawExcept']) ? tech['drawExcept'] : null;
        const branchGroup = builder.getGroup();

        let color = branchGroup == null ? null : colors[branchGroup];
        if (typeof color === 'string') encodeColorHex(color); // check hex
        else color = null;

        const parsedPos = parser.parse(x, y);
        builder
            .desc(desc)
            .x(parsedPos.x)
            .y(parsedPos.y)
            .drawExcept(drawLine)
            .branchColor(color);
    }
}