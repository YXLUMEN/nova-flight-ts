import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {empty} from "../../../utils/uit.ts";
import type {UUID} from "../../../type/types.ts";

export class Query implements Payload {
    public static readonly TYPE_ID = 0x04;
    public static readonly ID: PayloadType<Query> = payloadType('query');
    public static readonly CODEC: PacketCodec<Query> = PacketCodecs.of(
        empty,
        reader => {
            const count = reader.readUint8();
            const sessions: Session[] = new Array(count).fill(null);
            for (let i = 0; i < count; i++) {
                const sid = reader.readUint8();
                const uuid: UUID = reader.readUUID();
                sessions[i] = {sid, uuid};
            }
            return new Query(sessions);
        }
    );

    public readonly sessions: Session[];

    private constructor(sessions: Session[]) {
        this.sessions = sessions;
    }

    public type(): PayloadType<Query> {
        return Query.ID;
    }

    public accept(): void {
    }
}

// [0x00][0x04][count u8]([session_id u8][uuid 16B])*

type Session = { sid: number, uuid: UUID };