import type {ProtocolInfo} from "../protocol/ProtocolInfo.ts";
import type {BinaryReader} from "../../serialization/BinaryReader.ts";
import type {Payload} from "../Payload.ts";
import type {ChannelHandler} from "./ChannelHandler.ts";

export interface Channel {
    isOpen(): boolean;

    getSessionId(): number;

    setHandler(handler: ChannelHandler): void;

    inbound(protocol: ProtocolInfo): void;

    outbound(protocol: ProtocolInfo): void;

    broadcast(payload: Payload): void;

    unicast(payload: Payload): void;

    onMessage(reader: BinaryReader): void;

    disconnect(): void;
}