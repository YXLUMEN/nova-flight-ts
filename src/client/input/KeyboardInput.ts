import {MutVec2} from "../../utils/math/MutVec2.ts";
import {WorldConfig} from "../../configs/WorldConfig.ts";
import type {IInput} from "./IInput.ts";
// @ts-ignore
import {World} from "../../world/World.ts";
import {NovaFlightClient} from "../NovaFlightClient.ts";

export class KeyboardInput implements IInput {
    private readonly keys = new Set<string>();
    private readonly bindings = new Map<string, string[]>();
    private readonly keyHandler = new Map<string, (event: KeyboardEvent) => void>();
    private readonly wheelHandler = new Map<string, (event: WheelEvent) => void>();
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

    public onKeyDown(name: string, handler: (event: KeyboardEvent) => void): void {
        this.keyHandler.set(name, handler);
    }

    public onWheeling(name: string, handler: (event: WheelEvent) => void): void {
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

    private registryListener(target: HTMLElement) {
        window.addEventListener("keydown", e => {
            e.preventDefault();
            this.keys.add(e.code);
            for (const fn of this.keyHandler.values()) fn(e);
        });
        window.addEventListener("keyup", e => this.keys.delete(e.code));
        window.addEventListener("blur", () => this.keys.clear());
        window.addEventListener('wheel', e => {
            const player = NovaFlightClient.getInstance()!.player;
            if (player) player.switchWeapon(e.deltaY > 0 ? 1 : -1);
        }, {passive: true});

        target.addEventListener("mousemove", e => {
            const offset = NovaFlightClient.getInstance().window.camera.cameraOffset;
            this.pointer.set(e.offsetX + offset.x, e.offsetY + offset.y);
        }, {passive: true});

        target.addEventListener("mousedown", () => WorldConfig.autoShoot = true);
        target.addEventListener("mouseup", () => WorldConfig.autoShoot = false);
    }
}