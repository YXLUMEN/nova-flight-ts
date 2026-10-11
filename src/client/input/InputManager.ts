import type {IInput} from "./IInput.ts";
import type {Consumer} from "../../type/types.ts";
import type {InputBinding} from "./InputBinding.ts";
import {MutVec2} from "../../utils/math/MutVec2.ts";
import {EMPTY_INPUT, type InputEvents} from "./InputEvent.ts";
import {throttleTimeOut} from "../../utils/uit.ts";
import {mapMouse} from "./InputStroke.ts";
import {fromEvent} from "./KeyModifier.ts";

export class InputManager implements IInput {
    private readonly press = new Map<string, number>();
    private readonly prevKeys = new Set<string>();

    private readonly screenPointer = MutVec2.zero();
    private readonly worldPointer = MutVec2.zero();

    private globalInput: number = 0;
    // 兼容旧系统,可能会保留很长一段时间,但新功能不应依赖它
    private handler: InputEvents = EMPTY_INPUT;

    public constructor(target: HTMLElement) {
        this.registerKeyboardListener();
        this.registerMouseListener(target);
        this.registerWheelListener();
    }

    public getWorldPointer(): MutVec2 {
        return this.worldPointer;
    }

    public getScreenPointer(): MutVec2 {
        return this.screenPointer;
    }

    public updateEndFrame(): void {
        this.prevKeys.clear();
        for (const k of this.press.keys()) this.prevKeys.add(k);
    }

    public isDown(binding: InputBinding): boolean {
        for (const s of binding.get()) {
            const mod = this.press.get(s.code);
            if (mod !== s.modifiers) continue;
            return true;
        }
        return false;
    }

    public isKeyDown(code: string): boolean {
        return this.press.has(code);
    }

    public wasPressed(binding: InputBinding): boolean {
        for (const s of binding.get()) {
            const mod = this.press.get(s.code);
            if (mod !== s.modifiers || this.prevKeys.has(s.code)) continue;
            return true;
        }
        return false;
    }

    public wasKeyPressed(code: string): boolean {
        return this.press.has(code) && !this.prevKeys.has(code);
    }

    public getPressedSlot(binding: InputBinding): number {
        const strokes = binding.get();
        for (let i = 0; i < strokes.length; i++) {
            const s = strokes[i];
            const mod = this.press.get(s.code);
            if (mod === s.modifiers && !this.prevKeys.has(s.code)) return i;
        }

        return -1;
    }

    public requireInput(): Consumer<void> {
        this.globalInput++;
        let released = false;
        return () => {
            if (released) return;
            released = true;
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

            if (event.repeat || this.globalInput) return;
            this.press.set(code, fromEvent(event));
            this.handler.onKeyPress(this, event);
        });
        window.addEventListener('keyup', e => this.press.delete(e.code));
        window.addEventListener('blur', () => this.press.clear());
    }

    private registerMouseListener(target: HTMLElement): void {
        target.addEventListener('mousemove', event => {
            this.screenPointer.set(event.offsetX, event.offsetY);
            this.handler.onMouseMove(event);
        }, {passive: true});
        target.addEventListener('mousedown', event => {
            this.press.set(mapMouse(event.button), fromEvent(event));
            this.handler.onMouseDown(this, event);
        });
        window.addEventListener('mouseup', event => {
            this.press.delete(mapMouse(event.button));
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