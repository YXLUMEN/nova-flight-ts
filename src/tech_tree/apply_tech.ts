import {EMPWeapon} from "../weapon/EMPWeapon.ts";
import {LaserWeapon} from "../weapon/LaserWeapon.ts";
import {BaseWeapon} from "../weapon/BaseWeapon.ts";
import {Cannon90Weapon} from "../weapon/Cannon90Weapon.ts";
import {World} from "../world/World.ts";
import {BombWeapon} from "../weapon/BombWeapon.ts";
import {IntoVoidWeapon} from "../weapon/IntoVoidWeapon.ts";
import {MiniGunWeapon} from "../weapon/MiniGunWeapon.ts";
import {StatusEffectInstance} from "../entity/effect/StatusEffectInstance.ts";
import {StatusEffects} from "../entity/effect/StatusEffects.ts";

export function applyTech(world: World, id: string) {
    const player = world.player;
    switch (id) {
        case 'energy_focus':
            player.addWeapon('emp', new EMPWeapon(player));
            break;
        case 'laser':
            player.addWeapon('laser', new LaserWeapon(player));
            break;
        case 'high_efficiency_coolant': {
            const laser = player.weapons.get('laser');
            if (laser instanceof LaserWeapon) {
                laser.coolRate *= 1.5;
            }
            break;
        }
        case 'ad_capacitance': {
            const emp = player.weapons.get('emp');
            if (emp instanceof EMPWeapon) {
                emp.radius *= 1.5;
                emp.setMaxCooldown(emp.getMaxCooldown() * 1.2);
            }
            break;
        }
        case 'quick_charge': {
            const emp = player.weapons.get('emp');
            if (emp instanceof EMPWeapon) {
                emp.radius *= 0.5;
                emp.setMaxCooldown(emp.getMaxCooldown() * 0.5);
            }
            break;
        }
        case 'harmonic_analysis': {
            const laser = player.weapons.get('laser');
            if (laser instanceof LaserWeapon) {
                laser.damage = 2;
            }
            break;
        }
        case 'high_temperature_alloy': {
            const laser = player.weapons.get('laser');
            if (laser instanceof LaserWeapon) {
                laser.maxHeat *= 1.5;
            }
            break;
        }
        case 'gunboat_focus':
            player.addWeapon('mini', new MiniGunWeapon(player));
            break;
        case 'hd_bullet':
            player.weapons.values().forEach(w => {
                if (w instanceof BaseWeapon) w.damage += w.damage;
            });
            break;
        case 'ad_loading':
            player.weapons.values().forEach(w => {
                if (w instanceof BaseWeapon) w.setFireRate(w.getFireRate() * 0.8);
            });
            break;
        case '90_cannon': {
            const c90 = new Cannon90Weapon(player);
            player.addWeapon('90', c90);
            if (player.techTree.isUnlocked('hd_bullet')) {
                c90.damage += c90.damage;
            }
            break;
        }
        case 'hv_warhead': {
            const c90 = player.weapons.get('90');
            const bomb = player.weapons.get('bomb');
            if (c90 instanceof Cannon90Weapon) {
                c90.explosionRadius *= 1.5;
            }
            if (bomb instanceof BombWeapon) {
                bomb.damageRadius *= 1.5;
            }
            break;
        }
        case 'hd_explosives': {
            const c90 = player.weapons.get('90');
            const bomb = player.weapons.get('bomb');
            if (c90 instanceof Cannon90Weapon) {
                c90.damage *= 1.4;
            }
            if (bomb instanceof BombWeapon) {
                bomb.damage *= 1.4;
            }
            break;
        }
        case 'ship_opt':
            player.addStatusEffect(new StatusEffectInstance(StatusEffects.HEALTH_BOOST, -1, 0), null);
            player.setHealth(player.getMaxHealth());
            break;
        case 'into_void':
            player.addWeapon('into_void', new IntoVoidWeapon(player));
            break;
        case 'void_leap': {
            const intoVoid = player.weapons.get('into_void');
            if (intoVoid instanceof IntoVoidWeapon) {
                intoVoid.duration *= 0.1;
                intoVoid.setMaxCooldown(intoVoid.trueMaxCooldown() * 0.2);
                intoVoid.modifier.value = 1.5;
            }
            break;
        }
        case 'void_dweller': {
            const intoVoid = player.weapons.get('into_void');
            if (intoVoid instanceof IntoVoidWeapon) {
                intoVoid.duration *= 2;
                intoVoid.setMaxCooldown(intoVoid.trueMaxCooldown() * 1.4);
            }
            break;
        }
        case 'space_tear': {
            const intoVoid = player.weapons.get('into_void');
            if (intoVoid instanceof IntoVoidWeapon) {
                intoVoid.radius = 128;
            }
            break;
        }
        case 'explosive_armor':
            player.onDamageExplosionRadius *= 1.4;
            break;
        case 'meltdown': {
            const laser = player.weapons.get('laser');
            if (laser instanceof LaserWeapon) {
                laser.damage = 0;
                laser.laserColor = '#ff0000'
                laser.drainRate *= 1.5;
            }
            break;
        }
    }
}