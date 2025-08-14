import {Status} from "./Status.ts";
import type {Entity} from "../entity/Entity.ts";

export class SlowStatus extends Status {
    private readonly factor: number;

    constructor(duration: number, factor: number) {
        super(duration);
        this.factor = factor;
    }

    protected apply(entity: Entity, _: number) {
        entity.speedMul = this.factor;
    }
}