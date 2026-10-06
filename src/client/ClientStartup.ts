import type {UUID} from "../type/types.ts";
import {isValidUUID, uuidFromUsername} from "../utils/UUIDUtil.ts";
import {RegistryManager} from "../registry/RegistryManager.ts";
import {ClientWindow} from "./render/ClientWindow.ts";
import {ClientInit} from "./ClientInit.ts";
import {NovaFlightClient} from "./NovaFlightClient.ts";
import {IllegalStateError} from "../type/errors.ts";
import {BindSettings} from "./settings/BindSettings.ts";
import {Settings} from "./settings/Settings.ts";

export class ClientStartup {
    private finished = false;

    public clientId: UUID = null!;
    public playerName: string = null!;
    public readonly protocolVersion: number;

    public readonly manager: RegistryManager;
    public readonly window: ClientWindow;

    public constructor(protocolVersion: number) {
        this.protocolVersion = protocolVersion;
        this.manager = new RegistryManager();
        this.window = new ClientWindow();
    }

    public async load() {
        const rawName = localStorage.getItem('playerName') ?? 'player';
        const playerName = rawName.slice(0, 64);

        const uuid: UUID = await uuidFromUsername(playerName);
        const clientId: UUID = isValidUUID(uuid) ? uuid : crypto.randomUUID();

        localStorage.setItem('clientId', clientId);
        localStorage.setItem('playerName', playerName);
        this.clientId = clientId;
        this.playerName = playerName;

        await Settings.OPTIONS.load();
        BindSettings.init();

        this.window.resize();
        await new ClientInit().initResources(this.manager, this.window);
        this.finished = true;
    }

    public buildClient() {
        if (!this.finished) throw new IllegalStateError();
        return new NovaFlightClient(this);
    }
}