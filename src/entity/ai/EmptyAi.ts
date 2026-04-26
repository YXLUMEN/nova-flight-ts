import type {NbtCompound} from "../../nbt/element/NbtCompound.ts";
import type {EntityAi} from "./EntityAi.ts";

export class EmptyAi implements EntityAi {
    public static readonly INSTANCE = new EmptyAi();

    private constructor() {
    }

    public tick(): void {
    }

    public decision(): void {
    }

    public setSeed(): void {
    }

    public isDisabled(): boolean {
        return true;
    }

    public setDisabled(): void {
    }

    public setTarget(): void {
    }

    public setBehavior(): void {
    }

    public getBehavior(): number {
        return 0
    }

    public isSimple(): boolean {
        return false;
    }

    public writeNBT(nbt: NbtCompound): NbtCompound {
        return nbt;
    }

    public readNBT(): void {
    }
}