import type {IInput} from "./IInput.ts";
import type {NovaFlightClient} from "../NovaFlightClient.ts";
import type {InputManager} from "./InputManager.ts";
import type {Consumer} from "../../type/types.ts";
import {cleanObj, empty} from "../../utils/util.ts";
import {app} from "../../lib.ts";
import {isDev, RuntimeConfig} from "../../configs/RuntimeConfig.ts";
import {PlayerInputC2SPacket} from "../../network/packet/c2s/PlayerInputC2SPacket.ts";
import {DataLoader} from "../../resource/DataLoader.ts";
import {BitFlag} from "../../utils/BitFlag.ts";
import {DebugFlag} from "../render/DebugRenderer.ts";
import {InputBindings} from "./InputBindings.ts";
import {RequestTeleportC2SPacket} from "../../network/packet/c2s/RequestTeleportC2SPacket.ts";

export class ClientInputEvents {
    public static registryAll(client: NovaFlightClient, input: InputManager): void {
        this.windowEvents(client);

        input.setHandler(cleanObj({
            onKeyPress: (input, event) => {
                const code = event.code;
                if (code === 'Slash' || input.wasPressed(InputBindings.COMMAND_BAR)) {
                    const manager = client.clientCommandManager;
                    if (code !== 'Slash' || manager.getInput().length !== 0) {
                        event.preventDefault();
                    }

                    client.layer.gui.open(manager.proxy);
                    return;
                }

                event.preventDefault();
                this.onKeyDown(client, input, event);
            },
            onMouseMove: (event) => {
                const offset = client.window.camera.cameraOffset;
                input.getWorldPointer().set(
                    event.offsetX + offset.x,
                    event.offsetY + offset.y
                );
            },
            onMouseDown: (input) => {
                if (!client.player || client.player.isOpenInventory()) return;
                if (input.wasPressed(InputBindings.SWITCH_QUICK)) {
                    client.player.switchQuickFire();
                }
                if (input.wasPressed(InputBindings.QUICK_RELEASE)) {
                    client.player.launchQuickFire();
                }
            },
            onWheel: (event) => {
                if (!client.world) return;
                if (client.clientCommandManager.isShow() || !client.world.isTechTreeHidden()) return;
                client.player?.switchWeapon(event.deltaY > 0 ? 1 : -1);
            }
        }));
    }

    private static onKeyDown(client: NovaFlightClient, input: IInput, event: KeyboardEvent): void {
        const code = event.code;
        if (input.wasPressed(InputBindings.FULLSCREEN)) {
            app.isFullscreen()
                .then(isFull => app.setFullscreen(!isFull))
                .catch(console.error);
            return;
        }

        const world = client.world;
        if (world && world.isOver()) return;

        if (isDev && event.ctrlKey) {
            if (code === 'KeyV') {
                const player = client.player;
                if (player) {
                    client.networkHandler.sendCommand(`/debug ${!player.isDevMode()}`);
                }
            }
            if (client.player?.isDevMode() && world) {
                devFunc(client, code);
            }
            if (event.shiftKey && code === 'KeyP') {
                void DataLoader.reloadModel(client.registryManager);
            }
            return;
        }

        if (!world) return;
        switch (code) {
            case 'KeyI':
                RuntimeConfig.autoShoot = !RuntimeConfig.autoShoot;
                break;
            case 'Escape': {
                if (!client.player) return;

                client.player.setOpenInventory(false);
                client.setPause(!client.isPause());
                break;
            }
            case 'KeyG': {
                if (!client.player) return;
                const tech = client.player.getTechs();
                if (tech.isShow()) tech.close();
                else client.layer.gui.open(tech);

                client.player.setOpenInventory(false);
                client.connection.send(new PlayerInputC2SPacket('KeyG'));
                break;
            }
            case 'KeyL':
                RuntimeConfig.cameraFollow = !RuntimeConfig.cameraFollow;
                break;
            case 'F3':
                RuntimeConfig.debugFlag = BitFlag.toggle(RuntimeConfig.debugFlag, DebugFlag.BOUNDING_BOX);
                break;
            case 'F2':
                RuntimeConfig.debugFlag = BitFlag.toggle(RuntimeConfig.debugFlag, DebugFlag.HEALTH_BAR);
                break;
            case 'Backquote': {
                const ping = `Ping ${Math.floor(client.networkHandler.getLatency())}ms`;
                client.clientCommandManager.addPlainMessage(ping);
                break;
            }
            case 'KeyE': {
                if (!client.player) return;
                if (!client.player.getTechs().isShow()) {
                    const shouldClose = !client.player.isOpenInventory();
                    client.player.setOpenInventory(shouldClose);
                    client.setPause(shouldClose);
                }
                client.connection.send(new PlayerInputC2SPacket('KeyE'));
                break;
            }
        }
    }

    private static windowEvents(client: NovaFlightClient) {
        let blurDisable: Consumer<void> = empty;

        app.listen('tauri://focus', () => {
            blurDisable();
            blurDisable = empty;
        }).catch(console.error);

        app.listen('tauri://blur', () => {
            if (!client.clientCommandManager.isShow()) {
                client.setPause(true);
            }
            blurDisable = client.worldRender.disable();
        }).catch(console.error);

        let minimizedDisable: Consumer<void> = empty;
        app.listen('tauri://resize', async () => {
            if (await app.isMinimized()) {
                minimizedDisable = client.worldRender.disable();
            } else {
                minimizedDisable();
                minimizedDisable = empty;
            }
        }).catch(console.error);
    }
}

function devFunc(client: NovaFlightClient, code: string): void {
    const player = client.player;
    if (!player) return;

    const worker = client.getServerWorker();
    switch (code) {
        case 'KeyH':
            worker?.post({dev: 'health'});
            break;
        case 'NumpadSubtract': {
            RuntimeConfig.enableCameraOffset = !RuntimeConfig.enableCameraOffset;
            // @ts-expect-error Actually it's MutVec2
            client.window.camera.cameraOffset.set(0, 0);
            break;
        }
        case 'NumpadMultiply': {
            RuntimeConfig.crosshairRecoil = !RuntimeConfig.crosshairRecoil;
            break;
        }
        case 'KeyP':
            client.networkHandler.sendCommand('/kill @e[type=!target_drone]');
            break;
        case 'KeyC':
            worker?.post({dev: 'cd_all'});
            break;
        case 'KeyU':
            const pos = client.input.getWorldPointer().toImmut();
            client.connection.send(new RequestTeleportC2SPacket(pos));
            break;
    }
}