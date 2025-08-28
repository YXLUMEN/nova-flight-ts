import {World} from "./World.ts";
import {MutVec2} from "./utils/math/MutVec2.ts";
import {isMobile} from "./utils/uit.ts";
import {Vec2} from "./utils/math/Vec2.ts";
import {WorldConfig} from "./configs/WorldConfig.ts";

export class Input {
    private _pointer: MutVec2 = new MutVec2(World.W / 2, World.H - 80);

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
            if (!WorldConfig.followPointer) return;

            const viewOffset = World.instance.camera.viewOffset;
            this._pointer.x = e.offsetX + viewOffset.x;
            this._pointer.y = e.offsetY + viewOffset.y;
        }, {passive: true});

        isMobile() ? this.registryMobile() : this.registryDesktop(target);
    }

    private registryDesktop(target: HTMLElement) {
        target.addEventListener("pointerdown", () => WorldConfig.autoShoot = true);
        window.addEventListener("pointerup", () => WorldConfig.autoShoot = false);
    }

    private registryMobile() {
        const controlUi = document.getElementById('ui');
        controlUi?.classList.remove('hidden');
        controlUi?.addEventListener('click', event => {
            const target = event.target as HTMLElement;
            const id = target?.id;
            if (!target || !id) return;
            const world = World.instance;
            if (id === 'pause-play') world.togglePause();
            else if (id === 'tech-tree') world.toggleTechTree();
            else if (id === 'restart' && world.isOver) world.reset();
        });

        const bar = document.getElementById('action-bar');
        bar?.classList.remove('hidden');
        bar?.addEventListener('click', event => {
            const target = event.target as HTMLElement;
            const id = target?.id;
            if (!target || !id) return;

            const world = World.instance;
            const player = world.player;
            switch (id) {
                case 'sw-wpn':
                    player.switchWeapon();
                    break;
                case 'bomb':
                    player.weapons.get('bomb')?.tryFire(world);
                    break;
                case 'emp':
                    player.weapons.get('emp')?.tryFire(world);
                    break;
                case 'laser':
                    player.weapons.get('laser')?.tryFire(world);
                    break;
                case 'into-void':
                    player.weapons.get('into_void')?.tryFire(world);
                    break;
            }
        });
    }

    public get pointer(): MutVec2 {
        return this._pointer;
    }

    public getPointer(): Vec2 {
        return Vec2.formVec(this._pointer)
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