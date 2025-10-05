import {KeyboardInput} from "../input/KeyboardInput.ts";
import {WorldScreen} from "../render/WorldScreen.ts";
import {WorldConfig} from "../configs/WorldConfig.ts";
import {mainWindow} from "../main.ts";
import {NovaFlightServer} from "../server/NovaFlightServer.ts";
import {World} from "../world/World.ts";
import {BGMManager} from "../sound/BGMManager.ts";
import {PayloadTypeRegistry} from "../network/PayloadTypeRegistry.ts";
import {NetworkChannel} from "../network/NetworkChannel.ts";
import {ClientNetwork} from "./network/ClientNetwork.ts";
import {ClientNetworkChannel} from "./network/ClientNetworkChannel.ts";
import {StringPacket} from "../network/packet/StringPacket.ts";

export class NovaFlightClient {
    public static readonly input = new KeyboardInput(WorldScreen.canvas);
    private static clientStart = false;
    public static networkHandler: NetworkChannel;

    public static startClient(): void {
        if (this.clientStart) return;
        this.clientStart = true;

        this.input.onKeyDown('world_input', this.registryInput.bind(this));
        this.registryListener();
        ClientNetwork.registerNetwork();

        const ws = new WebSocket("ws://localhost:25566");
        this.networkHandler = new ClientNetworkChannel(ws, PayloadTypeRegistry.PLAY_C2S, crypto.randomUUID());
        this.networkHandler.init();

        // BGMManager.init();
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
                world.getMobs().forEach(mob => mob.discard());
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
            case 'NumpadSubtract': {
                WorldConfig.enableCameraOffset = !WorldConfig.enableCameraOffset;
                WorldScreen.camera.cameraOffset.set(0, 0);
                break;
            }
            case 'NumpadAdd': {
                BGMManager.next();
                break;
            }
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
            case 'KeyD':
                world.sendPacket(new StringPacket('Hello Server!'));
                break;
        }
    }

    private static registryListener() {
        mainWindow.listen('tauri://blur', () => {
            World.instance?.setTicking(false);
        }).catch(console.error);

        mainWindow.listen('tauri://resize', async () => {
            const world = World.instance;
            if (!world) return;
            world.rendering = !await mainWindow.isMinimized();
        }).catch(console.error);

        window.onresize = () => WorldScreen.resize();

        WorldScreen.canvas.addEventListener('click', event => {
            const world = World.instance;
            if (world && !world.isTicking) {
                WorldScreen.pauseOverlay.handleClick(event.offsetX, event.offsetY);
            }
        });
    }
}