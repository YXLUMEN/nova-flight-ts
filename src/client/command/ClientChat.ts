import type {NovaFlightClient} from "../NovaFlightClient.ts";
import {ChatMessageC2SPacket} from "../../network/packet/c2s/ChatMessageC2SPacket.ts";

export class ClientChat {
    private readonly client: NovaFlightClient;

    public constructor(client: NovaFlightClient) {
        this.client = client;
    }

    public sendMessage(input: string): void {
        const message = input.trim();
        if (message.length > 64) {
            this.client.clientCommandManager.addPlainMessage(
                `Chat message length cannot be greater than 64 characters, current is :${message.length}`
            );
            return;
        }
        this.client.networkChannel.send(new ChatMessageC2SPacket(input));
    }
}