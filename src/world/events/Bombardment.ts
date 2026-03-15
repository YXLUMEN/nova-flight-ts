import type {WorldEvent} from "./WorldEvent.ts";
import {PacketCodecs} from "../../network/codec/PacketCodecs.ts";
import type {PacketCodec} from "../../network/codec/PacketCodec.ts";
import type {World} from "../World.ts";
import type {IVec} from "../../utils/math/IVec.ts";
import {type WorldEventType} from "./WorldEventType.ts";
import {WorldEventTypes} from "./WorldEventTypes.ts";

export class Bombardment implements WorldEvent {
    public static readonly PACKET_CODEC: PacketCodec<Bombardment> = PacketCodecs.of(
        (writer, value) => {
            PacketCodecs.VECTOR2F.encode(writer, value.position);
            writer.writeVarUint(value.countdown);
            writer.writeVarUint(value.damage);
            writer.writeVarUint(value.radius);
        },
        reader => {
            return new Bombardment(
                PacketCodecs.VECTOR2F.decode(reader),
                reader.readVarUint(),
                reader.readVarUint(),
                reader.readVarUint(),
            )
        }
    );

    private activate: boolean = true;
    private age: number = 0;

    private readonly position: IVec;
    private readonly countdown: number;
    private readonly damage: number;
    private readonly radius: number;

    public constructor(position: IVec, countdown: number = 60, damage: number = 16, radius: number = 128) {
        this.position = position;
        this.countdown = countdown;
        this.damage = damage;
        this.radius = radius;
    }

    public tick(world: World): void {
        if (this.isDestroyed() || this.age < this.countdown || world.isClient) return;
        this.age++;
    }

    public emit(): void {
        this.age = this.countdown;
    }

    public cancel(): void {
        this.activate = false;
    }

    public isDestroyed(): boolean {
        return this.activate;
    }

    public getType(): WorldEventType<Bombardment> {
        return WorldEventTypes.BOMBARDMENT;
    }
}