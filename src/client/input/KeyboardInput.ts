import {MutVec2} from "../../utils/math/MutVec2.ts";
import {WorldConfig} from "../../configs/WorldConfig.ts";
import type {IInput} from "./IInput.ts";
// @ts-ignore
import {World} from "../../world/World.ts";
import {NovaFlightClient} from "../NovaFlightClient.ts";
import type {Consumer} from "../../apis/types.ts";

export class KeyboardInput implements IInput {
    private disableKey = false;

    private readonly keys = new Set<string>();
    private readonly bindings = new Map<string, string[]>();
    private readonly keyHandler = new Map<string, Consumer<KeyboardEvent>>();
    private readonly wheelHandler = new Map<string, Consumer<WheelEvent>>();
    private prevKeys = new Set<string>();

    private pointer = MutVec2.zero();

    public constructor(target: HTMLElement) {
        this.registryListener(target);
    }

    public get getPointer(): MutVec2 {
        return this.pointer;
    }

    public updateEndFrame(): void {
        this.prevKeys = new Set(this.keys);
    }

    public isDown(...ks: string[]) {
        return ks.some(k => this.keys.has(k));
    }

    public wasPressed(key: string): boolean {
        return this.keys.has(key) && !this.prevKeys.has(key);
    }

    public wasComboPressed(...keys: string[]): boolean {
        return keys.every(k => this.keys.has(k)) &&
            !keys.every(k => this.prevKeys.has(k));
    }

    public bindAction(action: string, keys: string[]): void {
        this.bindings.set(action, keys);
    }

    public isActionDown(action: string): boolean {
        const keys = this.bindings.get(action);
        return keys ? this.isDown(...keys) : false;
    }

    public wasActionPressed(action: string): boolean {
        const keys = this.bindings.get(action);
        return keys ? this.wasComboPressed(...keys) : false;
    }

    public onKeyDown(name: string, handler: Consumer<KeyboardEvent>): void {
        this.keyHandler.set(name, handler);
    }

    public onWheeling(name: string, handler: Consumer<WheelEvent>): void {
        this.wheelHandler.set(name, handler);
    }

    public delKeyDown(name: string): void {
        this.keyHandler.delete(name);
    }

    public delWheeling(name: string): void {
        this.wheelHandler.delete(name);
    }

    public clearKeyHandler(): void {
        this.keyHandler.clear();
    }

    public setDisabled(disabled: boolean): void {
        this.disableKey = disabled;
    }

    private registryListener(target: HTMLElement) {
        const commandManager = NovaFlightClient.getInstance().clientCommandManager;

        window.addEventListener('keydown', event => {
            const code = event.code;

            if (code === 'Escape' && commandManager.isShow()) {
                const hide = commandManager.onEsc();
                if (hide) this.setDisabled(false);
                return;
            }
            if ((code === 'Slash' || code === 'KeyT') && !commandManager.isShow()) {
                if (code === 'Slash' && commandManager.getInput().length > 0) {
                    event.preventDefault();
                }
                if (code === 'KeyT') event.preventDefault();

                commandManager.switchPanel(true);
                this.setDisabled(true);
            }

            if (this.disableKey) {
                if (code === 'F5' || ((event.ctrlKey || event.metaKey) && code === 'KeyR')) event.preventDefault();
                return;
            }

            event.preventDefault();
            this.keys.add(code);
            for (const fn of this.keyHandler.values()) fn(event);
        });
        window.addEventListener('keyup', e => this.keys.delete(e.code));
        window.addEventListener('blur', () => this.keys.clear());
        window.addEventListener('wheel', e => {
            const player = NovaFlightClient.getInstance().player;
            if (player) player.switchWeapon(e.deltaY > 0 ? 1 : -1);
        }, {passive: true});

        target.addEventListener('mousemove', e => {
            const offset = NovaFlightClient.getInstance().window.camera.cameraOffset;
            this.pointer.set(e.offsetX + offset.x, e.offsetY + offset.y);
        }, {passive: true});

        target.addEventListener('mousedown', e => {
            if (e.button === 0) {
                WorldConfig.autoShoot = true;
            }
            if (e.button === 1) {
                NovaFlightClient.getInstance().player?.switchQuickFire();
            }
            if (e.button === 2) {
                const player = NovaFlightClient.getInstance().player;
                if (player) player.launchQuickFire();
            }
        });
        target.addEventListener('mouseup', e => {
            if (e.button === 0) {
                WorldConfig.autoShoot = false;
            }
        });
    }
}