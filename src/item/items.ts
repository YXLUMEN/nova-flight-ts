import {Identifier} from "../registry/Identifier.ts";
import {Registry} from "../registry/Registry.ts";
import {Registries} from "../registry/Registries.ts";
import {Item} from "./Item.ts";
import {BombWeapon} from "./weapon/BombWeapon.ts";
import {EMPWeapon} from "./weapon/EMPWeapon.ts";
import {IntoVoidWeapon} from "./weapon/IntoVoidWeapon.ts";
import {MissileWeapon} from "./weapon/MissileWeapon.ts";
import {Cannon40Weapon} from "./weapon/BaseWeapon/Cannon40Weapon.ts";
import {Cannon90Weapon} from "./weapon/BaseWeapon/Cannon90Weapon.ts";
import {MiniGunWeapon} from "./weapon/BaseWeapon/MiniGunWeapon.ts";
import {RocketWeapon} from "./weapon/BaseWeapon/RocketWeapon.ts";
import {LaserWeapon} from "./weapon/LaserWeapon.ts";
import {DataComponentTypes} from "../component/DataComponentTypes.ts";

export class Items {
    public static AIR = this.register("air", new Item(new Item.Settings()));
    public static readonly BOMB_WEAPON = this.register("bomb_weapon", new BombWeapon(new Item.Settings()
        .attackDamage(8)
        .maxCooldown(800)
    ));
    public static readonly EMP_WEAPON = this.register("emp_weapon", new EMPWeapon(new Item.Settings()
        .attackDamage(0)
        .maxCooldown(500)
    ));
    public static readonly INTO_VOID_WEAPON = this.register("into_void_weapon", new IntoVoidWeapon(new Item.Settings()
        .attackDamage(0)
        .maxCooldown(1500)
    ));
    public static readonly MISSILE_WEAPON = this.register("missile_weapon", new MissileWeapon(new Item.Settings()
        .attackDamage(5)
        .maxCooldown(1000)
    ));
    public static readonly CANNON40_WEAPON = this.register("cannon40_weapon", new Cannon40Weapon(new Item.Settings()
        .attackDamage(2)
        .maxCooldown(8))
    );
    public static readonly CANNON90_WEAPON = this.register("cannon90_weapon", new Cannon90Weapon(new Item.Settings()
        .attackDamage(4)
        .maxCooldown(42)
        .component(DataComponentTypes.EXPLOSION_RADIUS, 96)
        .component(DataComponentTypes.EXPLOSION_DAMAGE, 5)
    ));
    public static readonly MINIGUN_WEAPON = this.register("minigun_weapon", new MiniGunWeapon(new Item.Settings()
        .attackDamage(1)
        .maxCooldown(3)
    ));
    public static readonly ROCKET_WEAPON = this.register("rocket_weapon", new RocketWeapon(new Item.Settings()
        .attackDamage(8)
        .maxCooldown(100)
    ));
    public static readonly LASER_WEAPON = this.register("laser_weapon", new LaserWeapon(new Item.Settings()));

    private static register(id: string, item: Item): Item {
        return Registry.registerReferenceById(Registries.ITEM, Identifier.ofVanilla(id), item).getValue();
    }

    public static init() {

    }
}