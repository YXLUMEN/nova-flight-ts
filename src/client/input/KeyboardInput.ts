import type {IInput} from "./IInput.ts";
import {EMPTY_INPUT, type InputEvents} from "./InputEvent.ts";
import type {MutVec2} from "../../utils/math/MutVec2.ts";
import {InputBinding} from "./InputBinding.ts";
import {MouseState} from "./MouseState.ts";
import {KeyboardState} from "./KeyboardState.ts";
import {throttleTimeOut} from "../../utils/uit.ts";

export class KeyboardInput implements IInput {
    private readonly keyboardState = new KeyboardState();
    private readonly mouseState = new MouseState();
    private readonly inputBinding = new InputBinding();

    private disableHandler = false;
    private globalInput = false;
    private inputEvents: InputEvents = EMPTY_INPUT;

    public constructor(target: HTMLElement) {
        this.registryListener(target);
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

    public bindAction(action: string, keys: string[]): void {
        this.inputBinding.bindAction(action, keys);
    }

    public isActionDown(action: string): boolean {
        const keys = this.inputBinding.getKeys(action);
        return keys ? this.keyboardState.isDownAny(...keys) : false;
    }

    public wasActionPressed(action: string): boolean {
        const keys = this.inputBinding.getKeys(action);
        return keys ? this.keyboardState.wasComboPressed(...keys) : false;
    }

    public startInput(on: boolean): void {
        this.globalInput = on;
    }

    public setHandlerDisabled(disabled: boolean): void {
        this.disableHandler = disabled;
    }

    public setInputEvents(events: InputEvents): void {
        this.inputEvents = events;
    }

    private registryListener(target: HTMLElement): void {
        this.registerKeyboardListener();
        this.registerMouseListener(target);
        this.registerWheelListener();
    }

    private registerKeyboardListener(): void {
        const allowedShortcuts = new Set(['KeyA', 'KeyC', 'KeyV', 'KeyX', 'KeyZ']);

        window.addEventListener('keydown', event => {
            const code = event.code;

            if (code === 'F5' || ((event.ctrlKey || event.metaKey) && !allowedShortcuts.has(code))) {
                event.preventDefault();
            }

            if (this.globalInput) return;

            if (this.handleCommandPanelShortcuts(event, code)) return;
            if (this.disableHandler) return;

            event.preventDefault();
            this.keyboardState.addKey(code);
            this.inputEvents.onKeyPress(code, event);
        });
        window.addEventListener('keyup', e => {
            this.keyboardState.removeKey(e.code);
        });
        window.addEventListener('blur', () => {
            this.keyboardState.clear();
        });
    }

    private handleCommandPanelShortcuts(event: KeyboardEvent, code: string): boolean {
        if (code === 'Escape') {
            this.inputEvents.onKeyPress('Escape', event);
            return true;
        }
        if (code === 'Slash' || code === 'KeyT') {
            this.inputEvents.onKeyPress(code, event);
            if (code === 'KeyT') event.preventDefault();
            return true;
        }
        return false;
    }

    private registerMouseListener(target: HTMLElement): void {
        target.addEventListener('mousemove', event => {
            this.mouseState.setScreenPointer(event.offsetX, event.offsetY);
            this.inputEvents.onMouseMove(event);
        }, {passive: true});
        target.addEventListener('mousedown', event => {
            this.mouseState.setMouseDown(true);
            this.inputEvents.onMouseDown(event.button, event);
        });
        target.addEventListener('mouseup', event => {
            this.mouseState.setMouseDown(false);
            this.inputEvents.onMouseUp(event.button, event);
        });
    }

    private registerWheelListener(): void {
        const onWheel = throttleTimeOut((e: WheelEvent) => {
            this.inputEvents.onWheel(e);
        }, 20);

        window.addEventListener('wheel', onWheel, {passive: true});
    }
}