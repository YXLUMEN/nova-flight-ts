import {Game} from "./Game.ts";
import {Vec2} from "./math/Vec2.ts";

export class Input {
    public keys = new Set<string>();
    private prevKeys = new Set<string>();

    public shoot = false;
    public pointer: Vec2 | null = null;
    public followMouse = true;

    constructor(target: HTMLElement) {
        window.addEventListener("keydown", (e) => {
            const key = e.key.toLowerCase();
            this.keys.add(key);
            if (key === "l") this.followMouse = !this.followMouse;
            else if (key === 'r') this.shoot = !this.shoot;
        });
        window.addEventListener("keyup", (e) => this.keys.delete(e.key.toLowerCase()));
        window.addEventListener("blur", () => this.keys.clear());

        // 移动端/鼠标支持: 移动控制，按下发射
        target.addEventListener("pointerdown", () => {
            this.shoot = true;
        });

        target.addEventListener("pointermove", (e) => {
            if (this.followMouse) this.pointer = new Vec2(
                e.offsetX + Game.instance.camera.viewOffset.x,
                e.offsetY + Game.instance.camera.viewOffset.y
            );
        }, {passive: true});

        window.addEventListener("pointerup", () => {
            this.shoot = false;
        });
    }

    public update() {
        this.prevKeys = new Set(this.keys);
    }

    public isDown(...ks: string[]) {
        return ks.some(k => this.keys.has(k));
    }

    public wasPressed(k: string): boolean {
        return this.keys.has(k) && !this.prevKeys.has(k);
    }
}