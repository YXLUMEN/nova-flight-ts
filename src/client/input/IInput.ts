import type {MutVec2} from "../../utils/math/MutVec2.ts";
import type {Consumer} from "../../type/types.ts";

export interface IInput {
    updateEndFrame(): void;

    isDown(...keys: string[]): boolean;

    wasPressed(key: string): boolean;

    wasComboPressed(...keys: string[]): boolean;

    getWorldPointer(): Readonly<MutVec2>;

    requireInput(): Consumer<void>;
}
