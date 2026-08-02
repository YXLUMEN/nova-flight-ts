import {clamp} from "../../utils/math/math.ts";
import {TranslatableText} from "../../i18n/TranslatableText.ts";
import {Tech} from "./Tech.ts";

export class TechBuilder {
    protected _name: string = 'unknown';
    protected _cost: number = 0;

    protected _requires: string[] | null = null;
    protected _conflicts: string[] | null = null;
    protected _branchGroup: string | null = null;

    public name(name: string) {
        this._name = name;
        return this;
    }

    public cost(cost: number) {
        this._cost = clamp(Math.floor(cost), 0, 65535);
        return this;
    }

    public costUnclamp(cost: number) {
        this._cost = cost | 0;
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
            TranslatableText.of(this._name),
            this._cost,
            this._requires,
            this._conflicts,
            this._branchGroup
        );
    }
}