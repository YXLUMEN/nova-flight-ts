import {PlayerEntity} from "../../entity/player/PlayerEntity.ts";
import type {ServerWorld} from "../ServerWorld.ts";
import {ServerTechTree} from "../tech/ServerTechTree.ts";
import {type ItemStack} from "../../item/ItemStack.ts";
import {PlayerSetScoreS2CPacket} from "../../network/packet/s2c/PlayerSetScoreS2CPacket.ts";
import type {GameProfile} from "./GameProfile.ts";
import {type DamageSource} from "../../entity/damage/DamageSource.ts";
import type {ServerStableHandler} from "../network/handler/ServerStableHandler.ts";
import {StatusEffectInstance} from "../../entity/effect/StatusEffectInstance.ts";
import {type Entity} from "../../entity/Entity.ts";
import {EntityStatusEffectS2CPacket} from "../../network/packet/s2c/EntityStatusEffectS2CPacket.ts";
import {RemoveEntityStatusEffectS2CPacket} from "../../network/packet/s2c/RemoveEntityStatusEffectS2CPacket.ts";
import {ServerItemCooldownManager} from "../item/ServerItemCooldownManager.ts";
import {Techs} from "../../tech/Techs.ts";
import {EdgeGlowEffect} from "../../effect/EdgeGlowEffect.ts";
import {GameMessageS2CPacket} from "../../network/packet/s2c/GameMessageS2CPacket.ts";
import {TranslatableTextS2CPacket} from "../../network/packet/s2c/TranslatableTextS2CPacket.ts";
import {Weapon} from "../../item/weapon/Weapon.ts";
import {BaseWeapon} from "../../item/weapon/BaseWeapon/BaseWeapon.ts";
import {InventoryS2CPacket} from "../../network/packet/s2c/InventoryS2CPacket.ts";

export class ServerPlayerEntity extends PlayerEntity {
    public readonly playerProfile: GameProfile;

    public networkHandler!: ServerStableHandler;
    public watchTechPage = false;
    private readonly inputKeys = new Set<string>();
    private readonly pendingSyncStack: Set<ItemStack> = new Set();

    private revision = 0;

    private mendingCooldown = 0;

    public constructor(world: ServerWorld, playerProfile: GameProfile) {
        super(world, ServerItemCooldownManager);

        this.playerProfile = playerProfile;
        this.techTree = new ServerTechTree(this);
        (this.cooldownManager as ServerItemCooldownManager).setPlayer(this);
    }

    public override tick() {
        super.tick();
        if (this.invulnerableTime > 0) {
            this.invulnerableTime--;
        }

        if (this.wasFiring) this.handleFire();
        this.inputKeys.clear();

        if (this.pendingSyncStack.size > 0) {
            const packet = new InventoryS2CPacket(0, this.nextRevision(), this.pendingSyncStack);
            this.networkHandler.send(packet);
            this.pendingSyncStack.clear();
        }

        // 没有采用效果方便精细控制
        if (this.getHealth() < this.getMaxHealth() &&
            this.techTree!.isUnlocked(Techs.NANO_MENDING) &&
            this.mendingCooldown-- <= 0) {
            this.heal(1);
            this.mendingCooldown = 60;
        }
    }

    public override aiStep() {
        super.aiStep();
        this.fireSpecials();
    }

    private fireSpecials() {
        const isDev = this.isDevMode();
        const world = this.getWorld();
        const inventory = this.getInventory();

        for (const [item, assign] of this.weaponKeys) {
            const stack = inventory.searchItem(item);
            if (stack.isEmpty()) continue;

            const bind = item.bindKey();
            const key = bind === null ? assign : bind;

            if (isDev && item.getCooldown(stack) > 0.5) {
                item.setCooldown(stack, 0.5);
                this.pendingSyncStack.add(stack);
            }

            if (this.inputKeys.delete(key) && item.canFire(stack)) {
                item.tryFire(stack, world, this);
                this.pendingSyncStack.add(stack);
            }
        }
    }

    public override takeDamage(damageSource: DamageSource, damage: number): boolean {
        if (super.takeDamage(damageSource, damage)) {
            this.mendingCooldown = 100;

            if (this.getHealth() / this.getMaxHealth() <= 0.2) {
                (this.getWorld() as ServerWorld).spawnEffect(null,
                    new EdgeGlowEffect('#ff3333', 32, 0.8, 4));
            }
            return true;
        }
        return false;
    }

    public setFiring(active: boolean) {
        this.wasFiring = active;

        const current = this.getCurrentItem();
        const item = current.getItem();
        if (!(item instanceof Weapon)) return;

        if (active) {
            item.onStartFire(current, this.getWorld(), this);
        } else {
            item.onEndFire(current, this.getWorld(), this);
        }
    }

    public handleFire() {
        const stack = this.getCurrentItem();
        const item = stack.getItem();

        if (item instanceof BaseWeapon && item.canFire(stack)) {
            item.tryFire(stack, this.getWorld(), this);
        }
    }

    public syncStack(itemStack: ItemStack): void {
        this.pendingSyncStack.add(itemStack);
    }

    public setCurrentItem(slot: number) {
        const stack = this.getCurrentItem();
        const item = stack.getItem();
        if (item instanceof Weapon) {
            item.onEndFire(stack, this.getWorld(), this);
        }
        this.getInventory().setSelectedSlot(slot);
    }

    public override isInvulnerableTo(damageSource: DamageSource): boolean {
        return super.isInvulnerableTo(damageSource) || this.isDevMode();
    }

    public override kill() {
        if (this.isDevMode()) return;
        super.kill();
    }

    public override onDeath(damageSource: DamageSource) {
        super.onDeath(damageSource);

        const mag = Math.random() > 0.5 ?
            `${this.getProfile().name} 船毁人亡` :
            `${this.getProfile().name} 坠机了`;

        this.networkHandler.broadcast(new GameMessageS2CPacket(mag));
    }

    public override addScore(score: number) {
        super.addScore(score);
        (this.getWorld() as ServerWorld).addPhase(score);
    }

    public override setScore(score: number) {
        super.setScore(score);
        this.networkHandler.send(new PlayerSetScoreS2CPacket(score));
    }

    protected override onEffectAdded(effect: StatusEffectInstance, source: Entity | null) {
        super.onEffectAdded(effect, source);
        this.networkHandler.send(EntityStatusEffectS2CPacket.create(this.getId(), effect));
    }

    protected override onEffectUpdated(effect: StatusEffectInstance, reapplyEffect: boolean, source: Entity | null) {
        super.onEffectUpdated(effect, reapplyEffect, source);
        this.networkHandler.send(EntityStatusEffectS2CPacket.create(this.getId(), effect));
    }

    protected override onEffectRemoved(effect: StatusEffectInstance) {
        super.onEffectRemoved(effect);
        this.networkHandler.send(new RemoveEntityStatusEffectS2CPacket(this.getId(), effect.getEffect()));
    }

    public copyFrom(oldPlayer: ServerPlayerEntity, alive: boolean): void {
        this.setDevMode(oldPlayer.isDevMode());
        this.getAttributes().setBaseFrom(oldPlayer.getAttributes());
        this.setHealth(this.getMaxHealth());

        if (alive) {
            this.setHealth(oldPlayer.getHealth());

            for (const stack of oldPlayer.getInventory()) {
                this.addItem(stack.getItem(), stack);
            }
            for (const effect of oldPlayer.getStatusEffects()) {
                this.addEffect(StatusEffectInstance.fromOther(effect), null);
            }

            this.setScore(oldPlayer.getScore());
        } else {
            this.setScore(oldPlayer.getScore() * 0.5);
        }

        for (const tag of oldPlayer.getTags()) {
            this.addTag(tag);
        }
    }

    public nextRevision(): number {
        this.revision = this.revision + 1 & 32767;
        return this.revision;
    }

    public handlerInput(key: string) {
        switch (key) {
            case 'KeyR':
                this.switchWeapon();
                break;
            case 'Space':
                this.handleFire();
                break;
            case 'KeyG':
                this.watchTechPage = !this.watchTechPage;
                break;
            default:
                this.inputKeys.add(key);
                break;
        }
    }

    public getProfile(): GameProfile {
        return this.playerProfile;
    }

    protected override getPermissionLevel(): number {
        const server = this.getWorld().getServer();
        if (!server) return 0;

        return server.isHost(this.getProfile()) ? 9 : super.getPermissionLevel();
    }

    public override sendMessage(msg: string) {
        this.networkHandler.send(new GameMessageS2CPacket(msg));
    }

    public override sendTranslatable(key: string, args?: string[]) {
        this.networkHandler.send(new TranslatableTextS2CPacket(key, args ?? []));
    }
}