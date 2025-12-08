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
import {RocketLauncherWeapon} from "./weapon/BaseWeapon/RocketLauncherWeapon.ts";
import {DataComponentTypes} from "../component/DataComponentTypes.ts";
import {IntoVoidWeapon} from "./weapon/IntoVoidWeapon.ts";
import {LaserWeapon} from "./weapon/LaserWeapon.ts";
import {DecoyReleaser} from "./weapon/DecoyReleaser.ts";
import {CIWS} from "./weapon/BaseWeapon/CIWS.ts";

export class Items {
    public static AIR = this.register("air", new Item(new Item.Settings()));
    public static readonly EMP_WEAPON = this.register("emp_weapon", new EMPWeapon(new Item.Settings()
        .attackDamage(0)
        .maxCooldown(200)
        .component(DataComponentTypes.EFFECT_RANGE, 480)
    ));
    public static readonly INTO_VOID_WEAPON: Item;
    public static readonly CANNON40_WEAPON = this.register("cannon40_weapon", new Cannon40Weapon(new Item.Settings()
        .maxDurability(50)
        .attackDamage(3)
        .maxCooldown(3)
        .component(DataComponentTypes.MAX_RELOAD_TIME, 16)
    ));
    public static readonly MINIGUN_WEAPON = this.register("minigun_weapon", new MiniGunWeapon(new Item.Settings()
        .maxDurability(250)
        .attackDamage(1)
        .maxCooldown(1)
        .component(DataComponentTypes.MAX_RELOAD_TIME, 50)
    ));
    public static readonly BOMB_WEAPON = this.register("bomb_weapon", new BombWeapon(new Item.Settings()
        .maxCooldown(800)
        .component(DataComponentTypes.EXPLOSION_RADIUS, 256)
        .component(DataComponentTypes.EXPLOSION_DAMAGE, 32)
    ));
    public static readonly CANNON90_WEAPON = this.register("cannon90_weapon", new Cannon90Weapon(new Item.Settings()
        .maxDurability(10)
        .attackDamage(6)
        .maxCooldown(16.5)
        .component(DataComponentTypes.EXPLOSION_RADIUS, 112)
        .component(DataComponentTypes.EXPLOSION_DAMAGE, 8)
        .component(DataComponentTypes.MAX_RELOAD_TIME, 35)
    ));
    public static readonly ROCKET_WEAPON = this.register("rocket_weapon", new RocketLauncherWeapon(new Item.Settings()
        .attackDamage(8)
        .maxCooldown(70)
        .unbreakable()
        .component(DataComponentTypes.EXPLOSION_RADIUS, 72)
        .component(DataComponentTypes.EXPLOSION_DAMAGE, 12)
    ));
    public static readonly MISSILE_WEAPON = this.register("missile_weapon", new MissileWeapon(new Item.Settings()
        .attackDamage(5)
        .maxCooldown(400)
        .component(DataComponentTypes.EXPLOSION_RADIUS, 72)
        .component(DataComponentTypes.EXPLOSION_DAMAGE, 12)
    ));
    public static readonly CIWS_WEAPON = this.register("ciws_weapon", new CIWS(new Item.Settings()
        .attackDamage(2)
        .maxCooldown(0)
        .unbreakable()
        .component(DataComponentTypes.MAX_HEAT, 144)
    ));
    public static readonly LASER_WEAPON: Item;
    public static readonly DECOY_RELEASER = this.register("decoy_releaser", new DecoyReleaser(new Item.Settings()
        .attackDamage(0)
        .maxCooldown(360)
    ));

    // 避免引用问题
    public static init() {
        (this.INTO_VOID_WEAPON as any) = this.register("into_void_weapon", new IntoVoidWeapon(new Item.Settings()
            .attackDamage(0)
            .maxCooldown(600)
            .component(DataComponentTypes.FIRING, false)
            .component(DataComponentTypes.EFFECT_RANGE, 32)
            .component(DataComponentTypes.EFFECT_DURATION, 100)
        ));
        (this.LASER_WEAPON as any) = this.register("laser_weapon", new LaserWeapon(new Item.Settings()
            .attackDamage(3)
            .component(DataComponentTypes.MAX_HEAT, 320)
            .component(DataComponentTypes.FIRING, false)
            .component(DataComponentTypes.HEAT, 0)
            .component(DataComponentTypes.DRAIN_RATE, 2)
            .component(DataComponentTypes.COOLDOWN_RATE, 1)
        ));
    }

    private static register(id: string, item: Item): Item {
        const entry = Registry.registerReferenceById(Registries.ITEM, Identifier.ofVanilla(id), item).getValue();
        (item.registryEntry as any) = Registries.ITEM.getEntryByValue(item);
        return entry;
    }
}