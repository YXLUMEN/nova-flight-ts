import {clamp} from "../../utils/math/math.ts";
import {TranslatableText} from "../../i18n/TranslatableText.ts";
import {Tech} from "./Tech.ts";

export class TechBuilder {
    protected name_: string = 'unknown';
    protected cost_: number = 0;

    protected requires_: string[] | null = null;
    protected conflicts_: string[] | null = null;
    protected branchGroup_: string | null = null;

    public name(name: string) {
        this.name_ = name;
        return this;
    }

    public cost(cost: number) {
        this.cost_ = clamp(Math.floor(cost), 0, 65535);
        return this;
    }

    public costUnclamp(cost: number) {
        this.cost_ = cost | 0;
        return this;
    }

    public requires(requires: string[] | null) {
        this.requires_ = requires;
        return this;
    }

    public conflicts(conflicts: string[] | null) {
        this.conflicts_ = conflicts;
        return this;
    }

    public branchGroup(branchGroup: string | null) {
        this.branchGroup_ = branchGroup;
        return this;
    }

    public getGroup() {
        return this.branchGroup_;
    }

    public build() {
        return new Tech(
            TranslatableText.of(this.name_),
            this.cost_,
            this.requires_,
            this.conflicts_,
            this.branchGroup_
        );
    }
}