import type {ProtocolInfo} from "../protocol/ProtocolInfo.ts";
import type {BinaryReader} from "../../serialization/BinaryReader.ts";
import type {Payload} from "../Payload.ts";
import type {ChannelHandler} from "./ChannelHandler.ts";

export interface Channel {
    getSid(): number;

    setHandler(handler: ChannelHandler): void;

    inbound(protocol: ProtocolInfo): void;

    outbound(protocol: ProtocolInfo): void;

    send(payload: Payload): void;

    feed(reader: BinaryReader): void;

    close(): void;
}