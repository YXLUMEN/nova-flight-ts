import type {Consumer, UUID} from "../../apis/types.ts";
import type {Payload, PayloadId} from "../../network/Payload.ts";
import type {IServerPlayNetwork} from "./IServerPlayNetwork.ts";
import {PayloadTypeRegistry} from "../../network/PayloadTypeRegistry.ts";
import {HashMap} from "../../utils/collection/HashMap.ts";
import {Identifier} from "../../registry/Identifier.ts";
import {BinaryWriter} from "../../nbt/BinaryWriter.ts";
import {BinaryReader} from "../../nbt/BinaryReader.ts";
import {UUIDUtil} from "../../utils/UUIDUtil.ts";

export class ServerIntegratedNetworkChannel implements IServerPlayNetwork {
    private mainPlayerUUID: UUID = UUIDUtil.EMPTY_UUID_STRING;

    private readonly registry = PayloadTypeRegistry.playS2C();
    private readonly handlers = new HashMap<Identifier, Consumer<Payload>>();

    public async connect(): Promise<void> {
        self.onmessage = this.onmessage.bind(this);
    }

    public disconnect(): void {
        self.postMessage({type: "DISCONNECT"});
    }

    public async sniff(): Promise<boolean> {
        return true;
    }

    public receive<T extends Payload>(id: PayloadId<T>, handler: Consumer<T>): void {
        this.handlers.set(id.id, handler as Consumer<Payload>);
    }

    public send<T extends Payload>(payload: T): void {
        const type = this.registry.get(payload.getId().id);
        if (!type) throw new Error(`Unknown payload type: ${payload.getId().id}`);

        const writer = new BinaryWriter();
        writer.writeString(type.id.toString());

        type.codec.encode(writer, payload);

        self.postMessage({type: "PACKET", packet: writer.toUint8Array()});
    }

    public sendTo<T extends Payload>(payload: T, target: UUID) {
        if (target !== this.mainPlayerUUID) return;
        this.send(payload);
    }

    public sendExclude<T extends Payload>(payload: T, ...excludes: UUID[]) {
        if (excludes.includes(this.mainPlayerUUID)) return;
        this.send(payload);
    }

    private decodePayload(buf: Uint8Array): Payload | null {
        const reader = new BinaryReader(buf);

        const idStr = reader.readString();
        const id = Identifier.tryParse(idStr);
        if (!id) return null;

        const type = PayloadTypeRegistry.getGlobal(id);
        if (!type) return null;

        return type.codec.decode(reader);
    }

    private onmessage(event: MessageEvent): void {
        switch (event.type) {
            case "connect": {
                const uuid = event.data.clientId;
                if (!UUIDUtil.isValidUUID(uuid)) return;

                this.mainPlayerUUID = uuid;
                break;
            }
            case "packet": {
                const binary = event.data as ArrayBuffer;
                const payload = this.decodePayload(new Uint8Array(binary));
                if (payload) {
                    const handler = this.handlers.get(payload.getId().id);
                    if (handler) handler(payload);
                }
                break;
            }
        }
    }

    public isOpen(): boolean {
        return true;
    }
}