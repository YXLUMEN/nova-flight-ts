import {Property} from "./Property.ts";
import {Optional} from "../../../utils/Optional.ts";

export class BooleanProperty extends Property<boolean> {
    private static readonly VALUES = [true, false];

    private constructor(name: string) {
        super(name, 'BooleanProperty');
    }

    public static create(name: string): BooleanProperty {
        return new BooleanProperty(name);
    }

    public getPossibleValues(): boolean[] {
        return BooleanProperty.VALUES;
    }

    public getValueName(value: boolean): string {
        return value.toString();
    }

    public getValue(name: string): Optional<boolean> {
        switch (name) {
            case 'true':
                return Optional.of(true);
            case 'false':
                return Optional.of(false);
            default:
                return Optional.empty();
        }
    }

    public getInternalIndex(value: Boolean): number {
        return value ? 0 : 1;
    }
}