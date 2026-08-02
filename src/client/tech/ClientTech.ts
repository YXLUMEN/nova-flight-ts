import {Tech} from "../../world/tech/Tech.ts";
import {TranslatableText} from "../../i18n/TranslatableText.ts";

export class ClientTech extends Tech {
    public readonly name: TranslatableText;
    public readonly desc: TranslatableText;

    public readonly x: number;
    public readonly y: number;

    public readonly drawExcept: Set<string | Tech> | null;

    public constructor(
        name: TranslatableText,
        desc: TranslatableText,
        cost: number,
        x: number,
        y: number,
        drawExcept: Iterable<string> | null,
        requires: Iterable<string> | null,
        conflicts: Iterable<string> | null,
        branchGroup: string | null,
    ) {
        super(name, cost, requires, conflicts, branchGroup);
        this.name = name;
        this.desc = desc;
        this.x = x;
        this.y = y;
        this.drawExcept = drawExcept !== null ? new Set(drawExcept) : null;
    }

    public override complete() {
        super.complete();

        if (this.drawExcept &&
            this.drawExcept.size > 0 &&
            this.drawExcept.values().every(tech => typeof tech === 'string')
        ) {
            const parsed = this.parseTechs(this.drawExcept as Set<string>);
            this.drawExcept.clear();
            this.drawExcept.union(parsed);
            parsed.forEach(item => this.drawExcept!.add(item));
        }
    }
}