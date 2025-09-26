import {BulletEntity} from "./BulletEntity.ts";
import {type NbtCompound} from "../../nbt/NbtCompound.ts";

export class CIWSBulletEntity extends BulletEntity {
    public override tick() {
        super.tick();
        if (this.age++ >= 25) this.discard();
    }

    public override writeNBT(nbt: NbtCompound): NbtCompound {
        super.writeNBT(nbt);
        nbt.putUint('Age', this.age);
        return nbt
    }

    public override readNBT(nbt: NbtCompound) {
        super.readNBT(nbt);
        this.age = nbt.getUint('Age');
    }
}