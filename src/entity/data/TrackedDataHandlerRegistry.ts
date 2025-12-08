import {TrackedData} from "./TrackedData.ts";
import type {TrackedDataHandler} from "./TrackedDataHandler.ts";
import {PacketCodecs} from "../../network/codec/PacketCodecs.ts";
import {createClean} from "../../utils/uit.ts";
import type {PacketCodec} from "../../network/codec/PacketCodec.ts";

export class TrackedDataHandlerRegistry {
    private static readonly DATA_HANDLERS_ID = new Map<TrackedDataHandler<any>, number>();
    private static readonly DATA_ID_HANDLERS = new Map<number, TrackedDataHandler<any>>();

    public static readonly BOOL = this.create(PacketCodecs.BOOL);
    public static readonly INT8 = this.create(PacketCodecs.INT8);
    public static readonly INTEGER = this.create(PacketCodecs.VAR_UINT);
    public static readonly FLOAT = this.create(PacketCodecs.FLOAT);
    public static readonly DOUBLE = this.create(PacketCodecs.DOUBLE);

    private static create<T>(codec: PacketCodec<T>): TrackedDataHandler<T> {
        const handler = createClean({
            codec: () => codec,
            createData(id: number): TrackedData<T> {
                return new TrackedData(id, this);
            },
            copy(data: T): T {
                return data;
            }
        });

        const index = this.DATA_HANDLERS_ID.size;
        this.DATA_ID_HANDLERS.set(index, handler);
        this.DATA_HANDLERS_ID.set(handler, index);
        return handler;
    }

    public static getId(handler: TrackedDataHandler<any>): number | null {
        return this.DATA_HANDLERS_ID.get(handler) ?? null;
    }

    public static getHandler(id: number): TrackedDataHandler<any> | null {
        return this.DATA_ID_HANDLERS.get(id) ?? null;
    }
}