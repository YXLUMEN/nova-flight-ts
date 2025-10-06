import type {ClientNetworkChannel} from "./ClientNetworkChannel.ts";
import {SoundEventS2CPacket} from "../../network/packet/s2c/SoundEventS2CPacket.ts";
import {NovaFlightClient} from "../NovaFlightClient.ts";
import {StopSoundS2CPacket} from "../../network/packet/s2c/StopSoundS2CPacket.ts";

export class ClientReceive {
    public static registryNetworkHandler(channel: ClientNetworkChannel) {
        channel.receive(SoundEventS2CPacket.ID, payload => {
            const world = NovaFlightClient.getInstance().world;
            if (!world) return

            if (payload.loop) {
                world.playLoopSound(payload.soundEvent, payload.volume, payload.pitch);
            } else {
                world.playSound(payload.soundEvent, payload.volume, payload.pitch);
            }
        });

        channel.receive(StopSoundS2CPacket.ID, payload => {
            const world = NovaFlightClient.getInstance().world;
            if (!world) return
            world.stopLoopSound(payload.soundEvent);
        });
    }
}