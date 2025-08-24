import {DamageSource} from "./DamageSource.ts";
import type {Entity} from "../Entity.ts";
import type {DamageType} from "./DamageType.ts";
import {DamageTypes} from "./DamageTypes.ts";
import type {RegistryKey} from "../../registry/RegistryKey.ts";
import {Registry} from "../../registry/Registry.ts";
import {RegistryManager} from "../../registry/RegistryManager.ts";
import {RegistryKeys} from "../../registry/RegistryKeys.ts";
import type {PlayerEntity} from "../PlayerEntity.ts";
import type {LivingEntity} from "../LivingEntity.ts";

export class DamageSources {
    private readonly registry: Registry<DamageType>;
    private readonly _generic: DamageSource;
    private readonly _laser: DamageSource;
    private readonly _removed: DamageSource;
    private readonly _void: DamageSource;
    private readonly _onFire: DamageSource;
    private readonly _explosion: DamageSource;

    public constructor(registryManager: RegistryManager) {
        this.registry = registryManager.get(RegistryKeys.DAMAGE_TYPE);
        this._generic = this.create(DamageTypes.GENERIC);
        this._laser = this.create(DamageTypes.LASER);
        this._removed = this.create(DamageTypes.REMOVED);
        this._void = this.create(DamageTypes.VOID);
        this._onFire = this.create(DamageTypes.ON_FIRE);
        this._explosion = this.create(DamageTypes.EXPLOSION);
    }

    public create(key: RegistryKey<DamageType>): DamageSource {
        return new DamageSource(this.registry.getEntryByKey(key));
    }

    public createWithAttacker(key: RegistryKey<DamageType>, attacker: Entity): DamageSource {
        return new DamageSource(this.registry.getEntryByKey(key), attacker);
    }

    public createWithSource(key: RegistryKey<DamageType>, source: Entity, attacker: Entity | null): DamageSource {
        return new DamageSource(this.registry.getEntryByKey(key), attacker, source);
    }

    public generic(): DamageSource {
        return this._generic;
    }

    public mobAttack(attacker: LivingEntity): DamageSource {
        return this.createWithAttacker(DamageTypes.MOB_ATTACK, attacker);
    }

    public playerAttack(attacker: PlayerEntity) {
        return this.createWithAttacker(DamageTypes.PLAYER_ATTACK, attacker);
    }

    public mobProjectile(source: Entity, attacker: LivingEntity | null) {
        return this.createWithSource(DamageTypes.MOB_PROJECTILE, source, attacker);
    }

    public explosion(source: Entity | null, attacker: LivingEntity | null) {
        if (source) {
            return this.createWithSource(DamageTypes.EXPLOSION, source, attacker);
        }
        return this._explosion;
    }

    public laser(attacker: LivingEntity | null) {
        if (attacker) {
            return this.createWithAttacker(DamageTypes.LASER, attacker);
        }
        return this._laser;
    }

    public playerImpact(attacker: PlayerEntity) {
        return this.createWithAttacker(DamageTypes.PLAYER_IMPACT, attacker);
    }

    public removed() {
        return this._removed;
    }

    public void(attacker: PlayerEntity | null) {
        if (attacker) {
            return this.createWithAttacker(DamageTypes.VOID, attacker);
        }
        return this._void;
    }

    public onFire() {
        return this._onFire;
    }
}
