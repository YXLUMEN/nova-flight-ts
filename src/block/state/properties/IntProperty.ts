import {Property} from "./Property.ts";
import {IllegalArgumentError} from "../../../type/errors.ts";
import {Optional} from "../../../utils/Optional.ts";

export class IntProperty extends Property<number> {
    private readonly values: number[];
    private readonly min: number;
    private readonly max: number;

    private constructor(name: string, min: number, max: number) {
        super(name, 'IntProperty');
        if (min < 0) {
            throw new IllegalArgumentError();
        }
        if (max <= min) {
            throw new IllegalArgumentError();
        }

        this.min = min;
        this.max = max;
        this.values = Array.from({length: max - min + 1}, (_, i) => min + i);
        Object.freeze(this.values);
    }

    public static create(name: string, min: number, max: number): IntProperty {
        return new IntProperty(name, Math.floor(min), Math.floor(max));
    }

    public getPossibleValues(): number[] {
        return this.values;
    }

    public getValueName(value: number): string {
        return value.toString();
    }

    public getValue(name: string): Optional<number> {
        const num = Number(name);
        if (num >= this.min && num <= this.max) {
            return Optional.ofNullable(num);
        }

        return Optional.empty();
    }

    public getInternalIndex(value: number): number {
        return value - this.values[0];
    }

    public getRange(): number {
        return this.max - this.min;
    }

    public getMin(): number {
        return this.values[0];
    }

    public getMax(): number {
        return this.values[this.values.length - 1];
    }

    public equals(other: unknown): boolean {
        if (!super.equals(other)) {
            return false;
        }

        if (other instanceof IntProperty) {
            return other.min === this.min && other.max === this.max;
        }

        return false;
    }

    public override generateHashCode(): number {
        let h = super.generateHashCode();
        h = (h * 31 + this.min) | 0;
        h = (h * 31 + this.max) | 0;
        return h;
    }
}