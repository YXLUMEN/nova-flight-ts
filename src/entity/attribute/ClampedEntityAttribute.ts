import {EntityAttribute} from "./EntityAttribute.ts";
import {clamp} from "../../utils/math/math.ts";

export class ClampedEntityAttribute extends EntityAttribute {
    private readonly minValue: number;
    private readonly maxValue: number;

    public constructor(fallback: number, min: number, max: number) {
        super(fallback);
        if (min > max) {
            throw new RangeError("Minimum value must be greater than maximum");
        }
        if (fallback < min) {
            throw new RangeError("Default value cannot be lower than minimum value");
        }
        if (fallback > max) {
            throw new RangeError("Default value cannot be bigger than maximum value!");
        }


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