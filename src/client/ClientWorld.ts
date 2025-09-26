import {KeyboardInput} from "../input/KeyboardInput.ts";
import {WorldScreen} from "../render/WorldScreen.ts";
import {WorldConfig} from "../configs/WorldConfig.ts";
import {mainWindow} from "../main.ts";
import {NovaFlightServer} from "../server/NovaFlightServer.ts";
import {World} from "../world/World.ts";
import {BGMManager} from "../sound/BGMManager.ts";

export class ClientWorld {
    public static readonly input = new KeyboardInput(WorldScreen.canvas);
    private static clientStart = false;

    public static startClient() {
        if (this.clientStart) return;
        this.clientStart = true;

        this.input.onKeyDown('world_input', this.registryInput.bind(this));
        BGMManager.init();
    }

    private static registryInput(event: KeyboardEvent) {
        const code = event.code;
        const world = World.instance;
        if (!world) return;

        if (event.ctrlKey) {
            if (code === 'KeyV') {
                WorldConfig.devMode = !WorldConfig.devMode;
                WorldConfig.usedDevMode = true;
            }
            if (WorldConfig.devMode) this.devMode(code, world);
            return;
        }

        switch (code) {
            case 'F11':
                mainWindow.isFullscreen()
                    .then(isFull => mainWindow.setFullscreen(!isFull))
                    .catch(console.error);
                break;
            case 'KeyT':
                WorldConfig.autoShoot = !WorldConfig.autoShoot;
                break;
            case 'Escape': {
                const techTree = document.getElementById('tech-shell')!;
                if (!techTree.classList.contains('hidden')) {
                    world.toggleTechTree();
                    return;
                }
                world.togglePause();
                break;
            }
            case 'KeyG':
                world.toggleTechTree();
                break;
            case 'KeyM':
                document.getElementById('help')?.classList.toggle('hidden');
                world.setTicking(false);
                break;
        }
    }

    private static devMode(code: string, world: World) {
        const player = world.player;
        if (!player) return;

        switch (code) {
            case 'KeyK':
                player.addPhaseScore(200);
                break;
            case 'KeyC':
                world.peaceMod = !world.peaceMod;
                world.peaceMod ? world.stage.pause() : world.stage.resume();
                world.getLoadMobs().forEach(mob => mob.discard());
                break;
            case 'KeyH':
                player.setHealth(player.getMaxHealth());
                break;
            case 'KeyO':
                player.techTree.unlockAll(world);
                break;
            case 'KeyL':
                world.stage.nextPhase();
                break;
            case 'KeyF':
                world.freeze = !world.freeze;
                break;
            case 'NumpadSubtract':
                WorldConfig.enableCameraOffset = !WorldConfig.enableCameraOffset;
                WorldScreen.camera.cameraOffset.set(0, 0);
                break;
            case 'KeyS':
                NovaFlightServer.saveGame(world.saveAll())
                    .then(() => {
                        world.gameOver();
                        world.reset();
                    });
                break;
            case 'KeyP':
                localStorage.removeItem('guided');
                break;
        }
    }
}