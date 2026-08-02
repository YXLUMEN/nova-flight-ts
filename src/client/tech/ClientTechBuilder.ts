import {TechBuilder} from "../../world/tech/TechBuilder.ts";
import {TranslatableText} from "../../i18n/TranslatableText.ts";
import {ClientTech} from "./ClientTech.ts";

export class ClientTechBuilder extends TechBuilder {
    private _desc: string = '';

    private _x: number = 0;
    private _y: number = 0;
    private _drawExcept: string[] | null = null;

    public desc(desc: string) {
        this._desc = desc;
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

    public drawExcept(except: string[] | null) {
        this._drawExcept = except;
        return this;
    }

    public override build() {
        return new ClientTech(
            TranslatableText.of(this._name),
            TranslatableText.of(this._desc),
            this._cost,
            this._x,
            this._y,
            this._drawExcept,
            this._requires,
            this._conflicts,
            this._branchGroup
        );
    }
}