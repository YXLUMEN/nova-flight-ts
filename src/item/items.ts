import {Identifier} from "../registry/Identifier.ts";
import {Registry} from "../registry/Registry.ts";
import {Registries} from "../registry/Registries.ts";
import {Item} from "./Item.ts";
import {BombWeapon} from "./weapon/BombWeapon.ts";
import {EMPWeapon} from "./weapon/EMPWeapon.ts";
import {MissileWeapon} from "./weapon/MissileWeapon.ts";
import {Cannon40Weapon} from "./weapon/BaseWeapon/Cannon40Weapon.ts";
import {Cannon90Weapon} from "./weapon/BaseWeapon/Cannon90Weapon.ts";
import {MiniGunWeapon} from "./weapon/BaseWeapon/MiniGunWeapon.ts";
import {RocketWeapon} from "./weapon/BaseWeapon/RocketWeapon.ts";
import {DataComponentTypes} from "../component/DataComponentTypes.ts";
import {IntoVoidWeapon} from "./weapon/IntoVoidWeapon.ts";
import {LaserWeapon} from "./weapon/LaserWeapon.ts";
import {DecoyReleaser} from "./weapon/DecoyReleaser.ts";
import {CIWS} from "./weapon/BaseWeapon/CIWS.ts";

export class Items {
    public static AIR = this.register("air", new Item(new Item.Settings()));
    public static readonly EMP_WEAPON = this.register("emp_weapon", new EMPWeapon(new Item.Settings()
        .attackDamage(0)
        .maxCooldown(500)
        .component(DataComponentTypes.EFFECT_RANGE, 480)
    ));
    public static readonly INTO_VOID_WEAPON: Item;
    public static readonly CANNON40_WEAPON = this.register("cannon40_weapon", new Cannon40Weapon(new Item.Settings()
        .attackDamage(3)
        .maxCooldown(7))
    );
    public static readonly MINIGUN_WEAPON = this.register("minigun_weapon", new MiniGunWeapon(new Item.Settings()
        .attackDamage(1)
        .maxCooldown(3)
    ));
    public static readonly BOMB_WEAPON = this.register("bomb_weapon", new BombWeapon(new Item.Settings()
        .maxCooldown(800)
        .component(DataComponentTypes.EXPLOSION_RADIUS, 256)
        .component(DataComponentTypes.EXPLOSION_DAMAGE, 32)
    ));
    public static readonly CANNON90_WEAPON = this.register("cannon90_weapon", new Cannon90Weapon(new Item.Settings()
        .attackDamage(4)
        .maxCooldown(42)
        .component(DataComponentTypes.EXPLOSION_RADIUS, 96)
        .component(DataComponentTypes.EXPLOSION_DAMAGE, 5)
    ));
    public static readonly ROCKET_WEAPON = this.register("rocket_weapon", new RocketWeapon(new Item.Settings()
        .attackDamage(8)
        .maxCooldown(100)
        .component(DataComponentTypes.EXPLOSION_RADIUS, 72)
        .component(DataComponentTypes.EXPLOSION_DAMAGE, 8)
    ));
    public static readonly MISSILE_WEAPON = this.register("missile_weapon", new MissileWeapon(new Item.Settings()
        .attackDamage(5)
        .maxCooldown(1000)
        .component(DataComponentTypes.EXPLOSION_RADIUS, 72)
        .component(DataComponentTypes.EXPLOSION_DAMAGE, 12)
    ));
    public static readonly CIWS_WEAPON = this.register("ciws_weapon", new CIWS(new Item.Settings()
        .attackDamage(2)
        .maxCooldown(1)
        .component(DataComponentTypes.MAX_HEAT, 360)
    ));
    public static readonly LASER_WEAPON: Item;
    public static readonly DECOY_RELEASER = this.register("decoy_releaser", new DecoyReleaser(new Item.Settings()
        .attackDamage(0)
        .maxCooldown(500)
    ));

    private static register(id: string, item: Item): Item {
        const entry = Registry.registerReferenceById(Registries.ITEM, Identifier.ofVanilla(id), item).getValue();
        (item.registryEntry as any) = Registries.ITEM.getEntryByValue(item);
        return entry;
    }

    // 避免引用问题
    public static init() {
        (this.INTO_VOID_WEAPON as any) = this.register("into_void_weapon", new IntoVoidWeapon(new Item.Settings()
            .attackDamage(0)
            .maxCooldown(1500)
            .component(DataComponentTypes.ACTIVE, false)
            .component(DataComponentTypes.EFFECT_RANGE, 32)
            .component(DataComponentTypes.EFFECT_DURATION, 250)
        ));
        (this.LASER_WEAPON as any) = this.register("laser_weapon", new LaserWeapon(new Item.Settings()
            .attackDamage(1)
            .component(DataComponentTypes.MAX_HEAT, 400)
            .component(DataComponentTypes.ACTIVE, false)
            .component(DataComponentTypes.HEAT, 0)
            .component(DataComponentTypes.DRAIN_RATE, 2)
            .component(DataComponentTypes.COOLDOWN_RATE, 1)
        ));
    }
}