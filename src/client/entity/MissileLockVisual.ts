import type {Entity} from "../../entity/Entity.ts";
import type {MissileEntity} from "../../entity/projectile/MissileEntity.ts";
import {AuraEffect} from "../../effect/AuraEffect.ts";


export class MissileLockVisual {
    private readonly locked: WeakMap<Entity, Group> = new WeakMap();

    public constructor() {
        this.summonAura = this.summonAura.bind(this);
    }

    public onTarget(missile: MissileEntity, target: Entity) {
        const group = this.locked.getOrInsertComputed(target, this.summonAura);
        group.missiles.add(missile);
    }

    public onMiss(missile: MissileEntity, last: Entity | null) {
        if (!last) return;

        const group = this.locked.get(last);
        if (!group) return;

        group.missiles.delete(missile);
    }

    private summonAura(entity: Entity): Group {
        const radius = entity.getDimensions().halfWidth + 6;
        const aura = new AuraEffect(entity.position(), radius, 0.1, '#fff922', 'bracket');

        aura.bindEntity = entity;
        aura.onTick = v => {
            const group = this.locked.get(entity);
            if (entity.isRemoved() || !group || group.missiles.size === 0) {
                v.kill();
                this.locked.delete(entity);
                return;
            }
            v.reset();
        }

        entity.getWorld().addEffect(null, aura);
        return {aura, missiles: new Set<MissileEntity>()};
    }
}

interface Group {
    aura: AuraEffect,
    missiles: Set<MissileEntity>,
}