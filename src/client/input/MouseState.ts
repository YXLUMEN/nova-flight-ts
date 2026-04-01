import {MutVec2} from "../../utils/math/MutVec2.ts";

export class MouseState {
    private readonly screenPointer = MutVec2.zero();
    private readonly worldPointer = MutVec2.zero();
    private mouseDown = false;

    public getScreenPointer(): MutVec2 {
        return this.screenPointer;
    }

    public getWorldPointer(): MutVec2 {
        return this.worldPointer;
    }

    public isMouseDown(): boolean {
        return this.mouseDown;
    }

    public setScreenPointer(x: number, y: number): void {
        this.screenPointer.set(x, y);
    }

    public setWorldPointer(x: number, y: number): void {
        this.worldPointer.set(x, y);
    }

    public setMouseDown(down: boolean): void {
        this.mouseDown = down;
    }
}