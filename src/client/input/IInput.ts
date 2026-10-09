import type {MutVec2} from "../../utils/math/MutVec2.ts";
import type {Consumer} from "../../type/types.ts";
import type {InputBinding} from "./InputBinding.ts";

export interface IInput {
    updateEndFrame(): void;

    isDown(binding: InputBinding): boolean;

    wasPressed(binding: InputBinding): boolean;

    getWorldPointer(): Readonly<MutVec2>;

    requireInput(): Consumer<void>;
}
