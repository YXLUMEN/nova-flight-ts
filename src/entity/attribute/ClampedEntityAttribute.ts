import {Attribute} from "./Attribute.ts";
import {assertClamp, clamp} from "../../utils/math/math.ts";

export class ClampedEntityAttribute extends Attribute {
    private readonly minValue: number;
    private readonly maxValue: number;

    public constructor(fallback: number, min: number, max: number) {
        super(fallback);
        assertClamp(fallback, min, max);
        this.minValue = min;
        this.maxValue = max;
    }

    public getMinValue() {
        return this.minValue;
    }

    public getMaxValue() {
        return this.maxValue;
    }

    public override clamp(value: number): number {
        return Number.isNaN(value) ? this.minValue : clamp(value, this.minValue, this.maxValue);
    }
}