import {Bombardment} from "./Bombardment.ts";
import {WorldEventType} from "./WorldEventType.ts";

export class WorldEventTypes {
    public static readonly BOMBARDMENT = WorldEventType.create(
        Bombardment, Bombardment.PACKET_CODEC
    );
}