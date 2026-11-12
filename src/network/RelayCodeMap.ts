import {isClient} from "../configs/RuntimeConfig.ts";

export class RelayCodeMap {
    private static readonly codes: Map<number, string> = new Map();

    public static get(code: number) {
        return this.codes.get(code);
    }

    public static init() {
        const add = (code: number, key: string) => {
            this.codes.set(code, key);
        }

        add(0x00, 'network.duplicate_server');
        add(0x01, 'network.invalide_register_packet');
        add(0x02, 'network.disconnect.duplicate_player');
        add(0x03, 'network.packet_too_large');
        if (isClient) return;
        add(0x04, 'network.exclude_too_much');
        add(0x05, 'network.invalid_action');
        add(0x06, 'network.empty_sid');
        add(0x07, 'network.kicked');
        add(0x08, 'network.baned');
        add(0x09, 'network.unban');
        add(0x10, 'network.did_not_ban');
        add(0x11, 'network.invalid_ipv4');
        add(0xFF, 'network.unknown_action');
    }
}