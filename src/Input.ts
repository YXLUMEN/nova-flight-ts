import {World} from "./world/World.ts";
import {MutVec2} from "./utils/math/MutVec2.ts";
import {Vec2} from "./utils/math/Vec2.ts";
import {WorldConfig} from "./configs/WorldConfig.ts";

export class Input {
    private worldPointer = new MutVec2(World.W / 2, World.H - 80);

    private readonly keys = new Set<string>();
    private prevKeys = new Set<string>();

    public constructor(target: HTMLElement) {
        this.registryListener(target);
    }

    private registryListener(target: HTMLElement) {
        window.addEventListener("keydown", (e) => {
            const code = e.code;
            this.keys.add(code);

            if (code === "KeyL") WorldConfig.followPointer = !WorldConfig.followPointer;
            if (code === 'KeyT') WorldConfig.autoShoot = !WorldConfig.autoShoot;
        });
        window.addEventListener("keyup", (e) => this.keys.delete(e.code));
        window.addEventListener("blur", () => this.keys.clear());

        target.addEventListener("pointermove", (e) => {
            if (WorldConfig.followPointer) {
                const offset = World.instance.camera.viewOffset;
                this.worldPointer.set(e.offsetX + offset.x, e.offsetY + offset.y);
            }
        }, {passive: true});

        this.registryDesktop(target);
    }

    private registryDesktop(target: HTMLElement) {
        target.addEventListener("pointerdown", () => WorldConfig.autoShoot = true);
        window.addEventListener("pointerup", () => WorldConfig.autoShoot = false);
    }

    public get pointer(): MutVec2 {
        return this.worldPointer;
    }

    public getPointer(): Vec2 {
        return Vec2.formVec(this.pointer);
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
}