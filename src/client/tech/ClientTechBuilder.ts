import {TechBuilder} from "../../world/tech/TechBuilder.ts";
import {TranslatableText} from "../../i18n/TranslatableText.ts";
import {ClientTech} from "./ClientTech.ts";

export class ClientTechBuilder extends TechBuilder {
    private desc_: string = '';

    private x_: number = 0;
    private y_: number = 0;
    private drawExcept_: string[] | null = null;
    private branchColor_: string | null = null;

    public desc(desc: string) {
        this.desc_ = desc;
        return this;
    }

    public x(x: number) {
        this.x_ = x;
        return this;
    }

    public y(y: number) {
        this.y_ = y;
        return this;
    }

    public drawExcept(except: string[] | null) {
        this.drawExcept_ = except;
        return this;
    }

    public branchColor(color: string | null) {
        this.branchColor_ = color;
        return this;
    }

    public override build() {
        return new ClientTech(
            TranslatableText.of(this.name_),
            TranslatableText.of(this.desc_),
            this.cost_,
            this.x_,
            this.y_,
            this.drawExcept_,
            this.requires_,
            this.conflicts_,
            this.branchGroup_,
            this.branchColor_,
        );
    }
}