import type {TechBuilder} from "../../world/tech/TechBuilder.ts";
import type {RawTech} from "../../type/ITech.ts";
import {isNonEmptyString} from "../../utils/util.ts";
import {encodeColorHex} from "../../utils/net_util.ts";
import {assert} from "../../utils/dom_util.ts";
import {TechLayoutParser} from "./TechLayoutParser.ts";
import {TechResolver} from "../../world/tech/TechResolver.ts";
import {ClientTechBuilder} from "./ClientTechBuilder.ts";

export class ClientTechResolver extends TechResolver {
    private readonly shellId: string;

    public constructor(techUrl: string, configUrl: string, shellId: string) {
        super(techUrl, configUrl);
        this.shellId = shellId;
    }

    public async load(): Promise<void> {
        const resp = await fetch(this.techUrl);
        const tech = await resp.json();
        const cResp = await fetch(this.configUrl);
        const config = await cResp.json();

        this.setTech(tech, config);
    }

    public normalize(): Map<string, TechBuilder> {
        if (!this.rawTech) throw new Error('None tech was found');

        const ele = document.getElementById(this.shellId)!;
        ele.classList.remove('hidden');
        const box = assert(ele, '#viewport')!.getBoundingClientRect();
        const x = Math.floor(box.width / 2);
        const y = Math.floor(80);
        ele.classList.add('hidden');

        const raw = this.rawTech;
        const colors = this.config.branch_color ?? {};
        const parser = new TechLayoutParser(x, y, 180, 80);

        for (let i = 0; i < raw.length; i++) {
            const item = raw[i];
            if (item == null || typeof item !== 'object') {
                throw new Error(`Tech[${i}] must be an object`);
            }

            const rawTech = item as RawTech;
            const builder = new ClientTechBuilder();
            const id = this.buildGeneral(rawTech, builder);
            this.buildClient(rawTech, builder, parser, colors);
            this.out.set(id, builder);
        }

        return this.out;
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
        return builder
            .desc(desc)
            .x(parsedPos.x)
            .y(parsedPos.y)
            .drawExcept(drawLine)
            .branchColor(color);
    }
}