import {MutVec2} from "../../utils/math/MutVec2.ts";
import {WorldConfig} from "../../configs/WorldConfig.ts";
import type {IInput} from "./IInput.ts";
// @ts-ignore
import {World} from "../../world/World.ts";
import {NovaFlightClient} from "../NovaFlightClient.ts";
import type {Consumer} from "../../apis/types.ts";
import {throttleTimeOut} from "../../utils/uit.ts";

export class KeyboardInput implements IInput {
    private disableHandler = false;
    private globalInput = false;

    private readonly keys = new Set<string>();
    private prevKeys = new Set<string>();

    private readonly bindings = new Map<string, string[]>();
    private keyHandler: Consumer<KeyboardEvent> | null = null;
    private wheelHandler: Consumer<WheelEvent> | null = null;

    private readonly pointer = MutVec2.zero();

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

    public onKeyDown(handler: Consumer<KeyboardEvent>): void {
        this.keyHandler = handler;
    }

    public onWheeling(handler: Consumer<WheelEvent>): void {
        this.wheelHandler = handler;
    }

    public clearKeyDown(): void {
        this.keyHandler = null;
    }

    public clearWheeling(): void {
        this.wheelHandler = null
    }

    public startInput(on: boolean): void {
        this.globalInput = on;
    }

    public setHandlerDisabled(disabled: boolean): void {
        this.disableHandler = disabled;
    }

    private registryListener(target: HTMLElement) {
        const client = NovaFlightClient.getInstance();
        const commandManager = client.clientCommandManager;

        const allowedShortcuts = new Set(['KeyA', 'KeyC', 'KeyV', 'KeyX', 'KeyZ',]);

        window.addEventListener('keydown', event => {
            const code = event.code;
            if (code === 'F5' || ((event.ctrlKey || event.metaKey) && !allowedShortcuts.has(code))) {
                event.preventDefault();
            }

            if (this.globalInput) return;

            if (code === 'Escape' && commandManager.isShow()) {
                const hide = commandManager.onEsc();
                if (hide) this.setHandlerDisabled(false);
                return;
            }

            if ((code === 'Slash' || code === 'KeyT') && !commandManager.isShow()) {
                if (code === 'Slash' && commandManager.getInput().length > 0) {
                    event.preventDefault();
                }
                if (code === 'KeyT') event.preventDefault();

                commandManager.switchPanel(true);
                this.setHandlerDisabled(true);
            }

            if (this.disableHandler) return;
            event.preventDefault();
            this.keys.add(code);
            this.keyHandler?.(event);
        });
        window.addEventListener('keyup', e => this.keys.delete(e.code));
        window.addEventListener('blur', () => this.keys.clear());

        const onWheel = throttleTimeOut((e: WheelEvent) => {
            this.wheelHandler?.(e);

            if (client.world && !client.world.isTechTreeHidden()) return;
            client.player?.switchWeapon(e.deltaY > 0 ? 1 : -1);
        }, 20);
        window.addEventListener('wheel', onWheel, {passive: true});

        target.addEventListener('mousemove', e => {
            const offset = client.window.camera.cameraOffset;
            this.pointer.set(e.offsetX + offset.x, e.offsetY + offset.y);
        }, {passive: true});
        target.addEventListener('mousedown', e => {
            if (e.button === 0) {
                WorldConfig.autoShoot = true;
            }
            if (e.button === 1) {
                client.player?.switchQuickFire();
            }
            if (e.button === 2) {
                client.player?.launchQuickFire();
            }
        });
        target.addEventListener('mouseup', e => {
            if (e.button === 0) {
                WorldConfig.autoShoot = false;
            }
        });
    }
}