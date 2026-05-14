import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import {SoundEvent} from "../../../sound/SoundEvent.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ClientPlayHandler} from "../../../client/network/handler/ClientPlayHandler.ts";

export class StopSoundS2CPacket implements Payload {
    public static readonly ID: PayloadType<StopSoundS2CPacket> = payloadType('stop_sound');
    public static readonly CODEC: PacketCodec<StopSoundS2CPacket> = PacketCodecs.adapt(
        SoundEvent.SOUND_PACKET_CODEC,
        val => val.soundEvent,
        val => new StopSoundS2CPacket(val)
    );

    public readonly soundEvent: SoundEvent;

    public constructor(soundEvent: SoundEvent) {
        this.soundEvent = soundEvent;
    }

    public type(): PayloadType<StopSoundS2CPacket> {
        return StopSoundS2CPacket.ID;
    }

    public accept(listener: ClientPlayHandler): void {
        listener.onStopSound(this);
    }

    public estimateSize(): number {
        return 4;
    }
}