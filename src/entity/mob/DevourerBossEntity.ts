import {BossEntity} from "./BossEntity.ts";
import {World} from "../../world/World.ts";
import {type DamageSource} from "../damage/DamageSource.ts";
import {EntityType} from "../EntityType.ts";
import {EntityAttributes} from "../attribute/EntityAttributes.ts";
import {clamp, getNearestEntityByVec, PI2, rand, thickLineCircleHit} from "../../utils/math/math.ts";
import {DataTracker} from "../data/DataTracker.ts";
import {TrackedDataHandlerRegistry} from "../data/TrackedDataHandlerRegistry.ts";
import type {ServerWorld} from "../../server/ServerWorld.ts";
import {MobMissileEntity} from "../projectile/MobMissileEntity.ts";
import {EntityTypes} from "../EntityTypes.ts";
import {MissileSetS2CPacket} from "../../network/packet/s2c/MissileSetS2CPacket.ts";
import {StatusEffects} from "../effect/StatusEffects.ts";
import {DevourerBehavior, DevourerBossAI, DevourerPhase} from "../ai/DevourerBossAI.ts";
import type {Entity} from "../Entity.ts";
import type {NbtCompound} from "../../nbt/element/NbtCompound.ts";
import {FireWave} from "../ai/FireWave.ts";
import {spawnLaser} from "../../utils/ServerEffect.ts";
import {SoundEvents} from "../../sound/SoundEvents.ts";
import {ScreenShakeS2CPacket} from "../../network/packet/s2c/ScreenShakeS2CPacket.ts";
import {DamageTypeTags} from "../../registry/tag/DamageTypeTags.ts";
import {PlayAudioS2CPacket} from "../../network/packet/s2c/PlayAudioS2CPacket.ts";
import {Audios} from "../../sound/Audios.ts";
import {AudioStopS2CPacket} from "../../network/packet/s2c/AudioStopS2CPacket.ts";
import {AudioLeapS2CPacket} from "../../network/packet/s2c/AudioControlS2CPacket.ts";
import {ExplosionEntity} from "../ExplosionEntity.ts";
import type {TrackedData} from "../data/TrackedData.ts";
import {EntityPositionForceS2CPacket} from "../../network/packet/s2c/EntityPositionForceS2CPacket.ts";
import type {EntitySpawnS2CPacket} from "../../network/packet/s2c/EntitySpawnS2CPacket.ts";

export class DevourerBossEntity extends BossEntity {
    private static readonly PHASE_TRACKER = DataTracker.registerData(Object(DevourerBossEntity),
        TrackedDataHandlerRegistry.VAR_UINT
    );
    private static readonly RESET_SEG = DataTracker.registerData(Object(DevourerBossEntity),
        TrackedDataHandlerRegistry.BOOL
    );

    private readonly PHASE2_HP_RATIO = 0.66;
    private readonly PHASE3_HP_RATIO = 0.2;
    public readonly SEGMENT_COUNT = 48;
    public readonly SEGMENT_SPACING = 44;
    public readonly SEGMENT_SPACING_SQ = this.SEGMENT_SPACING * this.SEGMENT_SPACING;

    private bulletCooldown: number = 60;
    private missileCooldown: number = 200;
    private selectCooldown: number = 0;
    private laserCooldown: number = 300;

    private primaryTarget: Entity | null = null;
    private currentPhase: DevourerPhase = DevourerPhase.PHASE_1;
    private phase2Triggered: boolean = false;
    private phase3Triggered: boolean = false;

    private readonly devAI: DevourerBossAI = new DevourerBossAI();

    public readonly segmentPoses: Float32Array;
    public readonly prevSegmentPoses: Float32Array;
    private readonly segShootCds: Uint8Array;

    private readonly bulletWaves: FireWave[] = [
        new FireWave(1, 5, 0, true, 0, 3.2),
        new FireWave(8, 5, 0, false, 0, 1.2),
        new FireWave(10, 6, 0, false, 0, 1.4),
        new FireWave(6, 4.5, 8, false, 0, PI2),
        new FireWave(12, 6.5, 0, true, 0, 1.6),
        new FireWave(8, 5, 0, false, 0, PI2 * 0.6),
        new FireWave(16, 4, 6, false, 0, PI2),
    ];

    public constructor(type: EntityType<DevourerBossEntity>, world: World, worth: number) {
        if (!BossEntity.hasBoss && !world.isClient) {
            world.sendPacket(new PlayAudioS2CPacket(Audios.SCOURGE_OF_THE_UNIVERSE, 1, true));
        }

        super(type, world, worth, 80);

        this.noClip = true;
        this.getAi().setDisable(true);

        this.segmentPoses = new Float32Array(this.SEGMENT_COUNT * this.SEGMENT_COUNT);
        this.prevSegmentPoses = new Float32Array(this.SEGMENT_COUNT * this.SEGMENT_COUNT);

        const segCount = this.SEGMENT_COUNT >> 1;
        this.segShootCds = new Uint8Array(segCount);
        for (let i = 0; i < segCount; i++) {
            this.segShootCds[i] = 1 + i * 3;
        }

        if (!world.isClient) this.restSeg();
        this.createBullet = this.createBullet.bind(this);
    }

    public override createLivingAttributes() {
        return super.createLivingAttributes()
            .addWithBaseValue(EntityAttributes.GENERIC_MAX_HEALTH, 400)
            .addWithBaseValue(EntityAttributes.GENERIC_ATTACK_DAMAGE, 10)
            .addWithBaseValue(EntityAttributes.GENERIC_MOVEMENT_SPEED, 10);
    }

    protected override defineSyncedData(builder: InstanceType<typeof DataTracker.Builder>) {
        super.defineSyncedData(builder);
        builder.define(DevourerBossEntity.PHASE_TRACKER, DevourerPhase.PHASE_1);
        builder.define(DevourerBossEntity.RESET_SEG, false);
    }

    public override tick(): void {
        if (this.getPhase() === DevourerPhase.STAGE_TRANSITION) return;
        super.tick();

        this.updateSegmentPositions();

        if (this.isClient()) return;
        const world = this.getWorld() as ServerWorld;

        this.tickTargetSelection(world);
        this.checkPhaseTransition(world);
        this.tickDevourerMovement();
        this.tickAttacks(world);
        this.tickSegmentAttacks(world);
    }

    private updateSegmentPositions(): void {
        const pos = this.positionRef;

        this.segmentPoses[0] = pos.x;
        this.segmentPoses[1] = pos.y;
        this.prevSegmentPoses[0] = this.prevX;
        this.prevSegmentPoses[1] = this.prevY;

        for (let i = 1; i < this.SEGMENT_COUNT; i++) {
            const pIdx = (i - 1) << 1;
            const prevX = this.segmentPoses[pIdx];
            const prevY = this.segmentPoses[pIdx + 1];

            const idx = i << 1;
            const currX = this.segmentPoses[idx];
            const currY = this.segmentPoses[idx + 1];

            const dx = prevX - currX;
            const dy = prevY - currY;
            const distSq = dx * dx + dy * dy;
            if (distSq <= this.SEGMENT_SPACING_SQ) continue;
            const dist = Math.sqrt(distSq);
            const ratio = this.SEGMENT_SPACING / dist;

            this.prevSegmentPoses[idx] = currX;
            this.prevSegmentPoses[idx + 1] = currY;
            this.segmentPoses[idx] = prevX - dx * ratio;
            this.segmentPoses[idx + 1] = prevY - dy * ratio;
        }
    }

    private restSeg(): void {
        const {x, y} = this.positionRef;
        for (let i = 0; i < this.SEGMENT_COUNT; i++) {
            const idx = i << 1;
            this.segmentPoses[idx] = x;
            this.segmentPoses[idx + 1] = y;
            this.prevSegmentPoses[idx] = x;
            this.prevSegmentPoses[idx + 1] = y;
        }
    }

    private tickTargetSelection(world: ServerWorld): void {
        if (this.selectCooldown-- > 0) return;

        this.primaryTarget = getNearestEntityByVec(this.positionRef, world.getPlayers());
        this.selectCooldown = this.primaryTarget ? 40 : 15;
    }

    private checkPhaseTransition(world: ServerWorld): void {
        const hpRatio = this.getHealth() / this.getMaxHealth();

        if (!this.phase2Triggered && hpRatio < this.PHASE2_HP_RATIO) {
            this.phase2Triggered = true;
            this.enterPhase(DevourerPhase.PHASE_2, world);
        } else if (!this.phase3Triggered && hpRatio < this.PHASE3_HP_RATIO) {
            this.phase3Triggered = true;
            this.enterPhase(DevourerPhase.STAGE_TRANSITION, world);
        }
    }

    private enterPhase(phase: DevourerPhase, world: ServerWorld): void {
        this.currentPhase = phase;
        this.dataTracker.set(DevourerBossEntity.PHASE_TRACKER, phase);
        this.invulnerable = true;

        if (phase === DevourerPhase.STAGE_TRANSITION) {
            this.transitionToPhase3(world);
            return;
        }

        const pos = this.positionRef;
        const particleCount = phase === DevourerPhase.PHASE_3 ? 48 : 32;
        world.spawnParticle(
            pos.x, pos.y,
            1, 1, particleCount,
            rand(300, 420),
            rand(0.6, 1.0), rand(8, 16),
            phase === DevourerPhase.PHASE_3 ? '#ff2200' : '#ff6600',
            phase === DevourerPhase.PHASE_3 ? '#660000' : '#ffaa00'
        );

        if (phase === DevourerPhase.PHASE_3) {
            this.setDevSpeed(this.getDevSpeed() * 1.5);
            for (const instance of this.getStatusEffects()) {
                const effect = instance.getEffect();
                if (effect.getValue().isBeneficial()) continue;
                this.removeEffect(effect);
            }
        }

        world.schedule(2, () => {
            if (!this.isRemoved()) this.invulnerable = false;
        });
    }

    private transitionToPhase3(world: ServerWorld): void {
        this.invulnerable = true;

        world.sendPacket(new PlayAudioS2CPacket(Audios.UNIVERSAL_COLLAPSE, 1, true));
        world.schedule(7.6, () => {
            const selfPos = this.positionRef;
            if (this.primaryTarget) {
                const pos = this.primaryTarget.positionRef;
                this.setPositionByVec(pos);
                this.setYaw(Math.atan2(pos.y - selfPos.y, pos.x - selfPos.x));
                world.sendPacket(EntityPositionForceS2CPacket.create(this));
            }

            const exp = new ExplosionEntity(EntityTypes.EXPLOSION_ENTITY, world, 40);
            exp.setPositionByVec(selfPos);
            world.spawnEntity(exp);
        });

        world.schedule(9.6, () => {
            this.dataTracker.set(DevourerBossEntity.RESET_SEG, true);
            world.sendPacket(new ScreenShakeS2CPacket(0.6, 1));
            world.sendPacket(new AudioLeapS2CPacket(9.6));
            this.enterPhase(DevourerPhase.PHASE_3, world);
        });
    }

    private tickDevourerMovement(): void {
        const intent = this.devAI.computeIntent(
            this.positionRef,
            this.primaryTarget?.positionRef ?? null,
            this.currentPhase,
            this.age,
            this.getDevSpeed()
        );

        if (intent.speed > 0.001) {
            const turnRate = this.currentPhase === DevourerPhase.PHASE_3 ? 0.06283 : 0.034906;
            this.setClampYaw(intent.targetYaw, turnRate);
        }

        const yaw = this.getYaw();
        this.setVelocity(Math.cos(yaw) * intent.speed, Math.sin(yaw) * intent.speed);

        const target = this.primaryTarget;
        if (!target) {
            this.devAI.setBehavior(DevourerBehavior.CHASE);
            return;
        }

        this.devAI.setBehavior(DevourerBehavior.CHASE);
    }

    private tickAttacks(world: ServerWorld): void {
        const emcDebuff = this.hasStatusEffect(StatusEffects.EMC_STATUS) ? 1.8 : 1.0;

        if (this.bulletCooldown-- <= 0) {
            this.bulletCooldown = (this.getBulletCooldown() * emcDebuff) | 0;
            this.fireBulletSpread(world);
        }

        if (this.missileCooldown-- <= 0) {
            this.missileCooldown = (this.getMissileCooldown() * emcDebuff) | 0;
            this.tryFireMissiles(world);
        }

        if (this.currentPhase === DevourerPhase.PHASE_3 && this.laserCooldown-- <= 0) {
            this.laserCooldown = 300;
            this.fireSkyLaser(world);
        }
    }

    private getBulletCooldown(): number {
        switch (this.currentPhase) {
            case DevourerPhase.PHASE_3:
                return 18;
            case DevourerPhase.PHASE_2:
                return 28;
            default:
                return 45;
        }
    }

    private getMissileCooldown(): number {
        switch (this.currentPhase) {
            case DevourerPhase.PHASE_3:
                return 120;
            case DevourerPhase.PHASE_2:
                return 180;
            default:
                return 260;
        }
    }

    private fireBulletSpread(world: ServerWorld): void {
        if (!this.primaryTarget) return;

        const yaw = this.getYaw();
        const pos = this.positionRef;
        const targetPos = this.primaryTarget.positionRef;

        let start = 1;
        let end = 1;
        if (this.currentPhase === DevourerPhase.PHASE_2) {
            start = 2;
            end = 3;
        } else if (this.currentPhase === DevourerPhase.PHASE_3) {
            start = 4;
            end = 6;
        }

        const predicate = () => !this.isRemoved() && this.getPhase() !== DevourerPhase.STAGE_TRANSITION;
        for (let i = start; i < end + 1; i++) {
            const wave = this.bulletWaves[i];
            wave.fireWithSpread(
                world,
                this.createBullet,
                pos,
                wave.resolveRadiusVec(pos, targetPos, yaw),
                predicate
            );
        }
    }

    private tickSegmentAttacks(world: ServerWorld): void {
        if (!this.primaryTarget || (this.age & 2) !== 0) return;

        const pPos = this.primaryTarget.positionRef;
        const wave = this.bulletWaves[0];

        for (let i = 0; i < this.segShootCds.length; i++) {
            if (this.segShootCds[i] > 0) {
                this.segShootCds[i]--;
                continue;
            }
            if (Math.random() > 0.04) continue;

            const idx = i << 1;
            const sx = this.segmentPoses[idx];
            const sy = this.segmentPoses[idx + 1];

            const angle = Math.atan2(pPos.y - sy, pPos.x - sx);
            wave.fireBulletWaveD(world, this.createBullet, sx, sy, angle, angle);
            this.segShootCds[i] = 20 + (Math.random() * 10) | 0;
        }
    }

    private tryFireMissiles(world: ServerWorld): void {
        if (this.currentPhase === DevourerPhase.PHASE_1) return;
        if (!this.primaryTarget) return;

        const missileCount = this.currentPhase === DevourerPhase.PHASE_3 ? 4 : 2;
        const pos = this.positionRef;
        let fired = 0;

        const interval = world.scheduleInterval(0.25, () => {
            if (fired++ >= missileCount || this.isRemoved()) {
                interval.cancel();
                return;
            }

            const side = fired % 2 === 0 ? 1 : -1;
            const yaw = this.getYaw();
            const driftAngle = yaw + side * (Math.PI / 2 + (Math.random() - 0.5) * 0.3);

            const missile = new MobMissileEntity(
                EntityTypes.MOB_MISSILE_ENTITY, world, this, driftAngle
            );
            missile.color = this.currentPhase === DevourerPhase.PHASE_3 ? '#ff2200' : '#cc0000';
            missile.setPosition(pos.x, pos.y);
            missile.setYaw(yaw);
            world.spawnEntity(missile);
            world.getNetworkChannel().send(
                new MissileSetS2CPacket(missile.getId(), missile.driftAngle, missile.hoverDir)
            );
        });
    }

    private fireSkyLaser(world: ServerWorld): void {
        const target = this.primaryTarget;
        if (!target) return;

        const offset = rand(-50, 50);
        const tx = target.positionRef.x;

        const startX = tx + offset;
        const startY = -80;
        const endX = tx - offset;
        const endY = World.WORLD_H + 80;

        spawnLaser(world, startX, startY, endX, endY, '#ff1100', 5, 0.8);
        world.schedule(0.85, () => {
            const laserWidth = 24;

            spawnLaser(world, startX, startY, endX, endY, '#372aff', laserWidth, 0.3);
            world.sendPacket(new ScreenShakeS2CPacket(0.4, 1));
            world.playSound(null, SoundEvents.ARC_BURST, 1, 0.8);

            const damageSource = world.getDamageSources().laser(this).setShieldMulti(0.2);
            for (const player of world.getPlayers()) {
                const pPos = player.positionRef;
                if (thickLineCircleHit(startX, startY, endX, endY, laserWidth, pPos.x, pPos.y, player.getDimensions().halfWidth)) {
                    player.takeDamage(damageSource, 15);
                }
            }
        });
    }

    public override takeDamage(damageSource: DamageSource, damage: number): boolean {
        if (this.currentPhase === DevourerPhase.PHASE_3 && !damageSource.isIn(DamageTypeTags.BYPASSES_INVULNERABLE)) {
            damage *= 0.7;
        }
        return super.takeDamage(damageSource, damage);
    }

    public override canHitByProjectile(): boolean {
        return this.getPhase() !== DevourerPhase.STAGE_TRANSITION && super.canHitByProjectile();
    }

    public override onDeath(damageSource: DamageSource): void {
        super.onDeath(damageSource);

        const world = this.getWorld() as ServerWorld;
        if (world.isClient) return;

        let times = 0;
        const pos = this.positionRef;
        const schedule = world.scheduleInterval(0.8, () => {
            if (times++ >= 3) {
                schedule.cancel();
                return;
            }

            const ox = (Math.random() - 0.5) * 120;
            const oy = (Math.random() - 0.5) * 120;
            world.spawnParticle(
                pos.x + ox, pos.y + oy,
                1, 1, 32,
                rand(300, 460),
                rand(0.8, 1.4), rand(10, 20),
                '#ff4400', '#ff9900'
            );
        });
        world.sendPacket(new AudioStopS2CPacket(Audios.UNIVERSAL_COLLAPSE));
    }

    public getPhase(): DevourerPhase {
        return this.dataTracker.get(DevourerBossEntity.PHASE_TRACKER);
    }

    private getDevSpeed(): number {
        return this.getAttributeValue(EntityAttributes.GENERIC_MOVEMENT_SPEED);
    }

    private setDevSpeed(speed: number): void {
        const inst = this.getAttributeInstance(EntityAttributes.GENERIC_MOVEMENT_SPEED);
        if (inst) inst.setBaseValue(clamp(speed, 0, 256));
    }

    protected override onOutOfBounds() {
    }

    public override shouldRender(): boolean {
        return this.getPhase() !== DevourerPhase.STAGE_TRANSITION;
    }

    public override onTrackedDataSet(data: TrackedData<any>) {
        super.onTrackedDataSet(data);
        if (data === DevourerBossEntity.RESET_SEG && this.dataTracker.get(DevourerBossEntity.RESET_SEG)) {
            this.restSeg();
        }
    }

    public override onSpawnPacket(packet: EntitySpawnS2CPacket): void {
        super.onSpawnPacket(packet);
        this.restSeg();
    }

    public override writeNBT(nbt: NbtCompound): NbtCompound {
        this.invulnerable = false;

        super.writeNBT(nbt);
        const phase = this.currentPhase === DevourerPhase.STAGE_TRANSITION ? DevourerPhase.PHASE_2 : this.currentPhase;
        nbt.setInt8('devourer_phase', phase);

        nbt.setInt8('bullet_cd', this.bulletCooldown);
        nbt.setInt16('missile_cd', this.missileCooldown);
        nbt.setInt16('laser_cd', this.laserCooldown);
        nbt.setBoolean('p2_trig', this.phase2Triggered);
        nbt.setBoolean('p3_trig', this.phase3Triggered);
        return nbt;
    }

    public override readNBT(nbt: NbtCompound): void {
        super.readNBT(nbt);
        this.currentPhase = nbt.getInt8('devourer_phase', DevourerPhase.PHASE_1) as DevourerPhase;
        this.dataTracker.set(DevourerBossEntity.PHASE_TRACKER, this.currentPhase);

        this.bulletCooldown = nbt.getInt8('bullet_cd', 60);
        this.missileCooldown = nbt.getInt16('missile_cd', 200);
        this.laserCooldown = nbt.getInt8('laser_cd', 300);
        this.phase2Triggered = nbt.getBoolean('p2_trig');
        this.phase3Triggered = nbt.getBoolean('p3_trig');
    }
}
