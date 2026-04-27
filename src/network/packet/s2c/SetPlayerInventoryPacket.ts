import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {ItemStack} from "../../../item/ItemStack.ts";
import type {ClientNetworkHandler} from "../../../client/network/ClientNetworkHandler.ts";

export class SetPlayerInventoryS2CPacket implements Payload {
    public static readonly ID: PayloadId<SetPlayerInventoryS2CPacket> = payloadId('set_player_inventory');
    public static readonly CODEC: PacketCodec<SetPlayerInventoryS2CPacket> = PacketCodecs.of(
        (writer, value) => {
            writer.writeVarUint(value.slot);
            ItemStack.PACKET_CODEC.encode(writer, value.contents);
        },
        reader => new SetPlayerInventoryS2CPacket(reader.readVarUint(), ItemStack.PACKET_CODEC.decode(reader))
    );

    public readonly slot: number;
    public readonly contents: ItemStack;

    public constructor(slot: number, contents: ItemStack) {
        this.slot = slot;
        this.contents = contents;
    }

    public getId(): PayloadId<SetPlayerInventoryS2CPacket> {
        return SetPlayerInventoryS2CPacket.ID;
    }

    public accept(listener: ClientNetworkHandler): void {
        listener.onSetInventory(this);
    }
}