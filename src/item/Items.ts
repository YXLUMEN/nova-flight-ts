import {Identifier} from "../registry/Identifier.ts";
import {Registry} from "../registry/Registry.ts";
import {Registries} from "../registry/Registries.ts";
import {Item} from "./Item.ts";
import {BombWeapon} from "./weapon/BombWeapon.ts";
import {EMPWeapon} from "./weapon/EMPWeapon.ts";
import {MissileWeapon} from "./weapon/MissileWeapon.ts";
import {Cannon40} from "./weapon/BaseWeapon/Cannon40.ts";
import {Cannon90} from "./weapon/BaseWeapon/Cannon90.ts";
import {MiniGun} from "./weapon/BaseWeapon/MiniGun.ts";
import {RocketLauncher} from "./weapon/BaseWeapon/RocketLauncher.ts";
import {DataComponents} from "../component/DataComponents.ts";
import {IntoVoidWeapon} from "./weapon/IntoVoidWeapon.ts";
import {PhaseLasers} from "./weapon/PhaseLasers.ts";
import {DecoyReleaser} from "./weapon/DecoyReleaser.ts";
import {CIWS} from "./weapon/BaseWeapon/CIWS.ts";
import {CloudLightningConduits} from "./weapon/BaseWeapon/CloudLightningConduits.ts";
import {FocusedArcEmitter} from "./weapon/BaseWeapon/FocusedArcEmitter.ts";
import {ArcEmitter} from "./weapon/BaseWeapon/ArcEmitter.ts";
import {Artillery125} from "./weapon/BaseWeapon/Artillery125.ts";
import {PointDefense} from "./PointDefense.ts";
import {FlakBattery} from "./FlakBattery.ts";
import {RailGun} from "./weapon/BaseWeapon/RailGun.ts";
import {KineticArtillery} from "./weapon/BaseWeapon/KineticArtillery.ts";
import {SpaceTorpedoes} from "./weapon/SpaceTorpedoes.ts";
import {GammaLasers} from "./weapon/BaseWeapon/GammaLasers.ts";
import {Coilguns} from "./weapon/BaseWeapon/Coilguns.ts";
import {ParticleLance} from "./weapon/BaseWeapon/ParticleLance.ts";
import {TachyonLance} from "./weapon/BaseWeapon/TachyonLance.ts";
import {PerditionBeam} from "./weapon/PerditionBeam.ts";
import {WeaponType} from "./WeaponType.ts";

export class Items {
    public static AIR = this.register("air", new Item(new Item.Settings()));
    public static readonly EMP_WEAPON = this.register("emp_weapon", new EMPWeapon(new Item.Settings()
        .attackDamage(0)
        .maxCooldown(240)
        .component(DataComponents.EFFECT_RANGE, 480)
    ));
    public static readonly INTO_VOID_WEAPON: Item;
    public static readonly CANNON40_WEAPON = this.register("cannon40_weapon", new Cannon40(new Item.Settings()
        .maxDurability(50)
        .attackDamage(3)
        .maxCooldown(3)
        .type(WeaponType.KINETIC)
        .component(DataComponents.MAX_RELOAD_TIME, 16)
    ));
    public static readonly MINIGUN_WEAPON = this.register("minigun_weapon", new MiniGun(new Item.Settings()
        .maxDurability(250)
        .attackDamage(1)
        .maxCooldown(1)
        .type(WeaponType.KINETIC)
        .component(DataComponents.MAX_RELOAD_TIME, 45)
    ));
    public static readonly BOMB_WEAPON = this.register("bomb_weapon", new BombWeapon(new Item.Settings()
        .maxCooldown(800)
        .type(WeaponType.EXPLOSIVE)
        .component(DataComponents.EXPLOSION_RADIUS, 256)
        .component(DataComponents.EXPLOSION_DAMAGE, 32)
    ));
    public static readonly CANNON90_WEAPON = this.register("cannon90_weapon", new Cannon90(new Item.Settings()
        .maxDurability(16)
        .attackDamage(6)
        .maxCooldown(16.5)
        .type(WeaponType.KINETIC, WeaponType.EXPLOSIVE)
        .component(DataComponents.EXPLOSION_RADIUS, 112)
        .component(DataComponents.EXPLOSION_DAMAGE, 8)
        .component(DataComponents.MAX_RELOAD_TIME, 35)
    ));
    public static readonly ROCKET_WEAPON = this.register("rocket_weapon", new RocketLauncher(new Item.Settings()
        .attackDamage(8)
        .maxCooldown(70)
        .unbreakable()
        .type(WeaponType.KINETIC, WeaponType.EXPLOSIVE)
        .component(DataComponents.EXPLOSION_RADIUS, 72)
        .component(DataComponents.EXPLOSION_DAMAGE, 12)
    ));
    public static readonly MISSILE_WEAPON = this.register("missile_weapon", new MissileWeapon(new Item.Settings()
        .attackDamage(5)
        .maxCooldown(400)
        .type(WeaponType.KINETIC, WeaponType.EXPLOSIVE)
        .component(DataComponents.EXPLOSION_RADIUS, 72)
        .component(DataComponents.EXPLOSION_DAMAGE, 12)
    ));
    public static readonly CIWS_WEAPON = this.register("ciws_weapon", new CIWS(new Item.Settings()
        .attackDamage(2)
        .maxCooldown(0)
        .unbreakable()
        .type(WeaponType.KINETIC)
        .component(DataComponents.MAX_HEAT, 144)
    ));
    public static readonly PHASE_LASERS: Item;
    public static readonly DECOY_RELEASER = this.register("decoy_releaser", new DecoyReleaser(new Item.Settings()
        .attackDamage(0)
        .maxCooldown(450)
    ));
    public static readonly CLOUD_LIGHTNING = this.register("cloud_lightning", new CloudLightningConduits(new Item.Settings()
        .attackDamage(16)
        .maxCooldown(40)
        .type(WeaponType.ENERGY, WeaponType.ARC)
        .unbreakable()
        .component(DataComponents.ATTACK_RANGE, 128) // 半径
    ));
    public static readonly ARC_EMITTER = this.register("arc_emitter", new ArcEmitter(new Item.Settings()
        .attackDamage(10)
        .maxCooldown(4)
        .maxDurability(100)
        .type(WeaponType.ENERGY, WeaponType.ARC)
        .component(DataComponents.MAX_RELOAD_TIME, 46)
        .component(DataComponents.ATTACK_RANGE, 65536) // 平方距离
    ));
    public static readonly FOCUSED_ARC_EMITTER = this.register("focused_arc_emitter", new FocusedArcEmitter(new Item.Settings()
        .attackDamage(48)
        .maxCooldown(32)
        .type(WeaponType.ENERGY, WeaponType.ARC)
        .unbreakable()
        .component(DataComponents.ATTACK_RANGE, 16384) // 平方距离
    ));
    public static readonly ARTILLERY125 = this.register("artillery125", new Artillery125(new Item.Settings()
        .maxDurability(8)
        .attackDamage(12)
        .maxCooldown(32)
        .type(WeaponType.KINETIC, WeaponType.EXPLOSIVE)
        .component(DataComponents.EXPLOSION_RADIUS, 210)
        .component(DataComponents.EXPLOSION_DAMAGE, 14)
        .component(DataComponents.MAX_RELOAD_TIME, 40)
    ));
    public static readonly POINT_DEFENSE = this.register("point_defense", new PointDefense(new Item.Settings()
        .type(WeaponType.ENERGY)
        .component(DataComponents.MAX_DEFENSE, 1)
    ));
    public static readonly FLAK_BATTERY = this.register("flak_battery", new FlakBattery(new Item.Settings()
        .attackDamage(1)
        .type(WeaponType.KINETIC)
        .component(DataComponents.MAX_DEFENSE, 1)
    ));
    public static readonly COILGUN = this.register("coilgun", new Coilguns(new Item.Settings()
        .maxDurability(50)
        .attackDamage(5)
        .maxCooldown(3)
        .type(WeaponType.KINETIC)
        .component(DataComponents.MAX_RELOAD_TIME, 16)
    ));
    public static readonly RAILGUN = this.register("railgun", new RailGun(new Item.Settings()
        .maxDurability(40)
        .attackDamage(16)
        .maxCooldown(5)
        .type(WeaponType.KINETIC)
        .component(DataComponents.MAX_RELOAD_TIME, 24)
    ));
    public static readonly KINETIC_ARTILLERY = this.register("kinetic_artillery", new KineticArtillery(new Item.Settings()
        .maxDurability(32)
        .attackDamage(32)
        .maxCooldown(24)
        .type(WeaponType.KINETIC)
        .component(DataComponents.MAX_RELOAD_TIME, 24)
    ));
    public static readonly SPACE_TORPEDOES = this.register("space_torpedoes", new SpaceTorpedoes(new Item.Settings()
        .attackDamage(16)
        .maxCooldown(400)
        .type(WeaponType.KINETIC, WeaponType.EXPLOSIVE)
        .component(DataComponents.EXPLOSION_RADIUS, 64)
        .component(DataComponents.EXPLOSION_DAMAGE, 16)
    ));
    public static readonly GAMMA_LASERS = this.register('gamma_lasers', new GammaLasers(new Item.Settings()
        .attackDamage(12)
        .maxCooldown(20)
        .unbreakable()
        .type(WeaponType.ENERGY)
    ));
    public static readonly PARTICLE_LANCE = this.register('particle_lance', new ParticleLance(new Item.Settings()
        .attackDamage(20)
        .maxCooldown(36)
        .unbreakable()
        .type(WeaponType.ENERGY)
    ));
    public static readonly TACHYON_LANCE = this.register('tachyon_lance', new TachyonLance(new Item.Settings()
        .attackDamage(40)
        .maxCooldown(36)
        .unbreakable()
        .type(WeaponType.ENERGY)
    ));
    public static readonly PERDITION_BEAM = this.register('perdition_beam', new PerditionBeam(new Item.Settings()
        .attackDamage(100)
        .type(WeaponType.ENERGY)
        .component(DataComponents.MAX_HEAT, 600)
        .component(DataComponents.FIRING, false)
        .component(DataComponents.HEAT, 0)
        .component(DataComponents.DRAIN_RATE, 6)
        .component(DataComponents.COOLDOWN_RATE, 1)
        .component(DataComponents.UI_COLOR, '#ff4927')
    ));

    // 避免引用问题
    public static init() {
        (this.INTO_VOID_WEAPON as any) = this.register("into_void_weapon", new IntoVoidWeapon(new Item.Settings()
            .attackDamage(0)
            .maxCooldown(600)
            .component(DataComponents.FIRING, false)
            .component(DataComponents.EFFECT_RANGE, 32)
            .component(DataComponents.EFFECT_DURATION, 100)
        ));
        (this.PHASE_LASERS as any) = this.register("phase_lasers", new PhaseLasers(new Item.Settings()
            .attackDamage(1)
            .type(WeaponType.ENERGY)
            .component(DataComponents.MAX_HEAT, 320)
            .component(DataComponents.FIRING, false)
            .component(DataComponents.HEAT, 0)
            .component(DataComponents.DRAIN_RATE, 3)
            .component(DataComponents.COOLDOWN_RATE, 1)
        ));
    }

    private static register(id: string, item: Item): Item {
        const entry = Registry.registerReferenceById(Registries.ITEM, Identifier.ofVanilla(id), item).getValue();
        (item.registryEntry as any) = Registries.ITEM.getEntryByValue(item);
        item.getName();
        return entry;
    }
}