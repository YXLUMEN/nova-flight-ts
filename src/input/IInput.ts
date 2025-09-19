import type {MutVec2} from "../utils/math/MutVec2.ts";

export interface IInput {
    updateEndFrame(): void;

    isDown(...keys: string[]): boolean;

    wasPressed(key: string): boolean;

    wasComboPressed(...keys: string[]): boolean;

    bindAction(action: string, keys: string[]): void;

    isActionDown(action: string): boolean;

    wasActionPressed(action: string): boolean;

    get getPointer(): Readonly<MutVec2>;
}
