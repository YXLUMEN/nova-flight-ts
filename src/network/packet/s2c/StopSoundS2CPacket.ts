import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import {SoundEvent} from "../../../sound/SoundEvent.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ClientNetworkHandler} from "../../../client/network/ClientNetworkHandler.ts";

export class StopSoundS2CPacket implements Payload {
    public static readonly ID: PayloadId<StopSoundS2CPacket> = payloadId('stop_sound');
    public static readonly CODEC: PacketCodec<StopSoundS2CPacket> = PacketCodecs.adapt(
        SoundEvent.SOUND_PACKET_CODEC,
        val => val.soundEvent,
        val => new StopSoundS2CPacket(val)
    );

    public readonly soundEvent: SoundEvent;

    public constructor(soundEvent: SoundEvent) {
        this.soundEvent = soundEvent;
    }

    public getId(): PayloadId<StopSoundS2CPacket> {
        return StopSoundS2CPacket.ID;
    }

    public accept(listener: ClientNetworkHandler): void {
        listener.onStopSound(this);
    }
}