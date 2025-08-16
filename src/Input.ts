import {World} from "./World.ts";
import {Vec2} from "./math/Vec2.ts";
import {isMobile} from "./utils/uit.ts";

export class Input {
    public pointer: Vec2 = new Vec2(World.W / 2, World.H - 80);

    private readonly keys = new Set<string>();
    private prevKeys = new Set<string>();

    public shoot = false;
    public followMouse = true;

    constructor(target: HTMLElement) {
        this.registryListener(target);
    }

    private registryListener(target: HTMLElement) {
        window.addEventListener("keydown", (e) => {
            const code = e.code;
            this.keys.add(code);

            if (code === "KeyL") this.followMouse = !this.followMouse;
            if (code === 'KeyT') this.shoot = !this.shoot;
        });
        window.addEventListener("keyup", (e) => this.keys.delete(e.code));
        window.addEventListener("blur", () => this.keys.clear());

        target.addEventListener("pointermove", (e) => {
            if (!this.followMouse) return;
            this.pointer.x = e.offsetX + World.instance.camera.viewOffset.x;
            this.pointer.y = e.offsetY + World.instance.camera.viewOffset.y;
        }, {passive: true});

        isMobile() ? this.registryMobile() : this.registryDesktop(target);
    }

    private registryDesktop(target: HTMLElement) {
        target.addEventListener("pointerdown", () => this.shoot = true);
        window.addEventListener("pointerup", () => this.shoot = false);
    }

    private registryMobile() {
        this.shoot = true;
        const bar = document.getElementById('action-bar');
        bar?.classList.remove('hidden');
        bar?.addEventListener('click', event => {
            const target = event.target as HTMLElement;
            const id = target?.id;
            if (!target || !id) return;

            const world = World.instance;
            const player = world.player;
            if (id === 'sw-wpn') player.switchWeapon();
            else if (id === 'bomb') player.weapons.get('bomb')?.tryFire(world);
            else if (id === 'emp') player.weapons.get('emp')?.tryFire(world);
            else if (id === 'laser') player.weapons.get('laser')?.tryFire(world);
            else if (id === 'void') player.weapons.get('void')?.tryFire(world);
        });
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