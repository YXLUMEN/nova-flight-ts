import {BulletEntity} from "./BulletEntity.ts";

export class CIWSBulletEntity extends BulletEntity {
    public override tick() {
        super.tick();
        if (this.age++ >= 25) this.discard();
    }
}