import type {IInput} from "./IInput.ts";
import {EMPTY_INPUT, type InputEvents} from "./InputEvent.ts";
import type {MutVec2} from "../../utils/math/MutVec2.ts";
import {MouseState} from "./MouseState.ts";
import {KeyboardState} from "./KeyboardState.ts";
import {throttleTimeOut} from "../../utils/uit.ts";
import type {Consumer} from "../../type/types.ts";

export class KeyboardInput implements IInput {
    private readonly keyboardState = new KeyboardState();
    private readonly mouseState = new MouseState();

    private globalInput: number = 0;
    private handler: InputEvents = EMPTY_INPUT;

    public constructor(target: HTMLElement) {
        this.registerKeyboardListener();
        this.registerMouseListener(target);
        this.registerWheelListener();
    }

    public getWorldPointer(): MutVec2 {
        return this.mouseState.getWorldPointer();
    }

    public getScreenPointer(): MutVec2 {
        return this.mouseState.getScreenPointer();
    }

    public isMouseDown(): boolean {
        return this.mouseState.isMouseDown();
    }

    public updateEndFrame(): void {
        this.keyboardState.updateEndFrame();
    }

    public isDown(...ks: string[]): boolean {
        return this.keyboardState.isDownAny(...ks);
    }

    public wasPressed(key: string): boolean {
        return this.keyboardState.wasPressed(key);
    }

    public wasComboPressed(...keys: string[]): boolean {
        return this.keyboardState.wasComboPressed(...keys);
    }

    public requireInput(): Consumer<void> {
        this.globalInput++;
        let released = false;
        return () => {
            if (released) return;
            this.globalInput--;
        };
    }

    public setHandler(handler: InputEvents): void {
        this.handler = handler;
    }

    private registerKeyboardListener(): void {
        const allowedShortcuts = new Set(['KeyA', 'KeyC', 'KeyV', 'KeyX', 'KeyZ']);

        window.addEventListener('keydown', event => {
            const code = event.code;

            if (code === 'F5' || ((event.ctrlKey || event.metaKey) && !allowedShortcuts.has(code))) {
                event.preventDefault();
            }

            if (this.globalInput) return;
            this.keyboardState.addKey(code);
            this.handler.onKeyPress(event);
        });
        window.addEventListener('keyup', e => {
            this.keyboardState.removeKey(e.code);
        });
        window.addEventListener('blur', () => {
            this.keyboardState.clear();
            this.mouseState.setMouseDown(false);
        });
    }

    private registerMouseListener(target: HTMLElement): void {
        target.addEventListener('mousemove', event => {
            this.mouseState.setScreenPointer(event.offsetX, event.offsetY);
            this.handler.onMouseMove(event);
        }, {passive: true});
        target.addEventListener('mousedown', event => {
            this.mouseState.setMouseDown(true);
            this.handler.onMouseDown(event.button, event);
        });
        target.addEventListener('mouseup', event => {
            this.mouseState.setMouseDown(false);
            this.handler.onMouseUp(event.button, event);
        });
    }

    private registerWheelListener(): void {
        const onWheel = throttleTimeOut((e: WheelEvent) => {
            this.handler.onWheel(e);
        }, 20);

        window.addEventListener('wheel', onWheel, {passive: true});
    }
}