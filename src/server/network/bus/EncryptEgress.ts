import type {Egress} from "./Egress.ts";

export interface EncryptEgress extends Egress {
    thenSend(task: Promise<Uint8Array<ArrayBuffer>>): void;
}