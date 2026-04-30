import {mainWindow} from "../../main.ts";
import {GlobalConfig} from "../../configs/GlobalConfig.ts";
import {PlayerInputC2SPacket} from "../../network/packet/c2s/PlayerInputC2SPacket.ts";
import type {NovaFlightClient} from "../NovaFlightClient.ts";
import {BGMManager} from "../../sound/BGMManager.ts";
import type {KeyboardInput} from "./KeyboardInput.ts";
import {createClean} from "../../utils/uit.ts";
import {DataLoader} from "../resource/DataLoader.ts";

export class ClientInputEvents {
    public static registryAll(client: NovaFlightClient, input: KeyboardInput): void {
        this.windowEvents(client);

        input.setInputEvents(createClean({
            onKeyPress: (code, event) => {
                const commandManager = client.clientCommandManager;

                if (code === 'Escape' && commandManager.isShow()) {
                    const hide = commandManager.onEsc();
                    if (hide) input.setHandlerDisabled(false);
                    return;
                }

                if ((code === 'Slash' || code === 'KeyT') && !commandManager.isShow()) {
                    commandManager.switchPanel(true);
                    input.setHandlerDisabled(true);
                    if (code === 'KeyT' || commandManager.getInput().length !== 0) {
                        event.preventDefault();
                    }
                }
                this.onKeyDown(client, event);
            },

            onMouseMove: (event) => {
                const offset = client.window.camera.cameraOffset;
                input.getWorldPointer().set(
                    event.offsetX + offset.x,
                    event.offsetY + offset.y
                );
            },

            onMouseDown: (button) => {
                if (button === 0) {
                    GlobalConfig.autoShoot = true;
                }

                if (!client.player || client.player.isOpenInventory()) return;
                if (button === 1) {
                    client.player.switchQuickFire();
                }
                if (button === 2) {
                    client.player.launchQuickFire();
                }
            },

            onMouseUp: (button) => {
                if (button === 0) {
                    GlobalConfig.autoShoot = false;
                }
            },

            onWheel: (event) => {
                if (client.world && !client.world.isTechTreeHidden()) return;
                client.player?.switchWeapon(event.deltaY > 0 ? 1 : -1);
            }
        }));
    }

    private static onKeyDown(client: NovaFlightClient, event: KeyboardEvent): void {
        const code = event.code;
        if (code === 'F11') {
            mainWindow.isFullscreen()
                .then(isFull => mainWindow.setFullscreen(!isFull))
                .catch(console.error);
            return;
        }

        const world = client.world;
        if (world && world.isOver) return;

        if (event.ctrlKey) {
            if (code === 'KeyV') client.switchDevMode();
            if (client.player?.isDevMode() && world) {
                this.devFunc(client, code);
            }
            if (event.shiftKey && code === 'KeyP') {
                void DataLoader.reloadModel(client.registryManager);
            }
            return;
        }

        if (!world) return;
        switch (code) {
            case 'KeyI':
                GlobalConfig.autoShoot = !GlobalConfig.autoShoot;
                break;
            case 'Escape': {
                const techTree = document.getElementById('tech-shell')!;
                if (!techTree.classList.contains('hidden')) {
                    client.toggleTechTree();
                    return;
                }
                client.player?.setOpenInventory(false);
                client.togglePause();
                break;
            }
            case 'KeyG':
                client.player?.setOpenInventory(false);
                client.toggleTechTree();
                client.connection.send(new PlayerInputC2SPacket('KeyG'));
                break;
            case 'KeyL':
                GlobalConfig.cameraFollow = !GlobalConfig.cameraFollow;
                break;
            case 'F3':
                GlobalConfig.renderHitBox = !GlobalConfig.renderHitBox;
                break;
            case 'Tab':
                const ping = `Ping ${Math.floor(client.networkHandler.getLatency())}ms`;
                client.clientCommandManager.addPlainMessage(ping);
                break;
            case 'KeyE':
                if (client.player) {
                    const shouldClose = !client.player.isOpenInventory();
                    client.player.setOpenInventory(shouldClose);
                    client.setPause(shouldClose);
                }
                break;
        }
    }

    private static devFunc(client: NovaFlightClient, code: string): void {
        const player = client.player;
        if (!player) return;

        const worker = client.getServerWorker();
        worker?.postMessage({type: 'dev_mode', payload: {code}});

        switch (code) {
            case 'KeyH':
                player.setHealth(player.getMaxHealth());
                break;
            case 'KeyO':
                player.getTechs().unlockAll();
                break;
            case 'NumpadSubtract': {
                GlobalConfig.enableCameraOffset = !GlobalConfig.enableCameraOffset;
                client.window.camera.cameraOffset.set(0, 0);
                break;
            }
            case 'NumpadAdd': {
                BGMManager.next();
                break;
            }
            case 'NumpadMultiply': {
                GlobalConfig.crosshairRecoil = !GlobalConfig.crosshairRecoil;
                break;
            }
            case 'KeyP':
                localStorage.removeItem('guided');
                break;
            case 'F8':
                worker?.postMessage({type: 'crash_the_server'});
                break;
            case 'KeyC':
                worker?.postMessage({type: 'cd_all'});
                break;
        }
    }

    private static windowEvents(client: NovaFlightClient) {
        mainWindow.listen('tauri://focus', () => {
            GlobalConfig.fps = GlobalConfig.lastFps;
            GlobalConfig.perFrame = 1000 / GlobalConfig.fps;
        }).catch(console.error);

        mainWindow.listen('tauri://blur', () => {
            if (!client.clientCommandManager.isShow()) {
                client.setPause(true);
            }
            GlobalConfig.lastFps = GlobalConfig.fps;
            GlobalConfig.fps = 5;
            GlobalConfig.perFrame = 1000 / GlobalConfig.fps;
        }).catch(console.error);

        mainWindow.listen('tauri://resize', async () => {
            client.worldRender.rendering = !await mainWindow.isMinimized();
        }).catch(console.error);

        client.window.canvas.addEventListener('click', event => {
            if (!client.player) return;
            client.player.clientInventory.justClicked = true;

            if (client.world && client.isPause() && !client.player.isOpenInventory()) {
                client.window.pauseOverlay.handleClick(event.offsetX, event.offsetY);
            }
        });
    }
}