import type {Payload} from "../Payload.ts";

export interface PayloadWithOrigin {
    sessionId: number;
    payload: Payload;
}