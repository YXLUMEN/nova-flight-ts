import {BossEntity} from "./BossEntity.ts";
import {World} from "../../world/World.ts";
import {type DamageSource} from "../damage/DamageSource.ts";
import {EntityType} from "../EntityType.ts";
import {EntityAttributes} from "../attribute/EntityAttributes.ts";
import {doubleEquals, getNearestEntityByVec, rand} from "../../utils/math/math.ts";
import {DataTracker, type DataTrackerBuilder} from "../data/DataTracker.ts";
import {TrackedDataHandlerRegistry} from "../data/TrackedDataHandlerRegistry.ts";
import type {ServerWorld} from "../../server/ServerWorld.ts";
import {EntityTypes} from "../EntityTypes.ts";
import {DevourerBossAI, DevourerPhase} from "../ai/devourer/DevourerBossAI.ts";
import type {Entity} from "../Entity.ts";
import type {NbtCompound} from "../../nbt/element/NbtCompound.ts";
import {ScreenShakeS2CPacket} from "../../network/packet/s2c/ScreenShakeS2CPacket.ts";
import {PlayAudioS2CPacket} from "../../network/packet/s2c/PlayAudioS2CPacket.ts";
import {Audios} from "../../sound/Audios.ts";
import {AudioStopS2CPacket} from "../../network/packet/s2c/AudioStopS2CPacket.ts";
import {AudioLeapS2CPacket} from "../../network/packet/s2c/AudioControlS2CPacket.ts";
import {ExplosionEntity} from "../ExplosionEntity.ts";
import type {TrackedData} from "../data/TrackedData.ts";
import {EntityPositionForceS2CPacket} from "../../network/packet/s2c/EntityPositionForceS2CPacket.ts";
import {type EntitySpawnS2CPacket} from "../../network/packet/s2c/EntitySpawnS2CPacket.ts";
import {Vec2} from "../../utils/math/Vec2.ts";
import {MutVec2} from "../../utils/math/MutVec2.ts";
import {ParticleEffects} from "../../effect/ParticleEffects.ts";

export class DevourerBoss extends BossEntity {
    private static readonly PHASE_TRACKER = DataTracker.registerData(Object(DevourerBoss),
        TrackedDataHandlerRegistry.VAR_UINT
    );
    private static readonly RESET_SEG = DataTracker.registerData(Object(DevourerBoss),
        TrackedDataHandlerRegistry.BOOL
    );

    public readonly segmentCount = 96;
    private readonly segmentSpacing = 44;
    private readonly segmentSpacingSq = this.segmentSpacing * this.segmentSpacing;
    public turnRate = 0.034906;

    private selectCooldown: number = 0;
    private primaryTarget: Entity | null = null;

    private currentPhase: DevourerPhase = DevourerPhase.PHASE_1;
    declare protected readonly AI: DevourerBossAI;

    public readonly segPoses: Float32Array;
    public readonly prevSegPoses: Float32Array;

    public constructor(type: EntityType<DevourerBoss>, world: World, worth: number) {
        super(type, world, worth, 120);

        this.noClip = true;

        this.segPoses = new Float32Array(this.segmentCount * this.segmentCount);
        this.prevSegPoses = new Float32Array(this.segmentCount * this.segmentCount);

        this.setMovementSpeed(12);
        if (!world.isClient) {
            world.sendPacket(new PlayAudioS2CPacket(Audios.SCOURGE_OF_THE_UNIVERSE, 1, true));
        }
    }

    public override createLivingAttributes() {
        return super.createLivingAttributes()
            .addWithBaseValue(EntityAttributes.GENERIC_MAX_HEALTH, 1600)
            .addWithBaseValue(EntityAttributes.GENERIC_ATTACK_DAMAGE, 10);
    }

    protected override defineSyncedData(builder: DataTrackerBuilder): void {
        super.defineSyncedData(builder);
        builder.define(DevourerBoss.PHASE_TRACKER, DevourerPhase.PHASE_1);
        builder.define(DevourerBoss.RESET_SEG, false);
    }

    protected createAi() {
        return new DevourerBossAI(this, this.createBullet);
    }

    public override tick(): void {
        if (this.getPhase() === DevourerPhase.PHASE_2_TO_3) return;
        super.tick();
        this.updateSegmentPositions();
    }

    protected override tickAi() {
        this.tickTargetSelection();
        this.AI.tick();
        this.checkPhaseTransition();
    }

    private tickTargetSelection(): void {
        if (this.selectCooldown-- > 0) return;

        this.primaryTarget = getNearestEntityByVec(this.positionRef, this.getWorld().getPlayers());
        this.selectCooldown = this.primaryTarget ? 40 : 15;
    }

    public override move(movement: Vec2): void {
        const adjusted = new MutVec2(movement.x, movement.y);
        this.adjustBlockCollision(adjusted);

        const cx = !doubleEquals(movement.x, adjusted.x, 1E-5);
        const cy = !doubleEquals(movement.y, adjusted.y, 1E-5);

        if (cx || cy) {
            this.getWorld().addPreparedParticleVec(
                ParticleEffects.SMOKE,
                this.positionRef,
                6
            );
        }
        super.move(movement);
    }

    private checkPhaseTransition(): void {
        const world = this.getWorld() as ServerWorld;
        const hpRatio = this.getHealth() / this.getMaxHealth();

        if (this.currentPhase < DevourerPhase.PHASE_2 && hpRatio < 0.66) {
            this.enterPhase(DevourerPhase.PHASE_2, world);
            return;
        }
        if (this.currentPhase < DevourerPhase.PHASE_2_TO_3 && hpRatio < 0.34) {
            this.enterPhase(DevourerPhase.PHASE_2_TO_3, world);
            return;
        }
        return;
    }

    private enterPhase(phase: DevourerPhase, world: ServerWorld): void {
        this.currentPhase = phase;
        this.dataTracker.set(DevourerBoss.PHASE_TRACKER, phase);
        this.invulnerable = true;

        if (phase === DevourerPhase.PHASE_2_TO_3) {
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

        for (const instance of this.getStatusEffects()) {
            const effect = instance.getEffect();
            if (effect.getValue().isBeneficial()) continue;
            this.removeEffect(effect);
        }

        if (phase === DevourerPhase.PHASE_3) {
            this.turnRate = 0.06283;
            this.setMovementSpeed(15);
        }

        world.schedule(2, () => this.invulnerable = false);
    }

    private transitionToPhase3(world: ServerWorld): void {
        this.invulnerable = true;

        world.sendPacket(new PlayAudioS2CPacket(Audios.UNIVERSAL_COLLAPSE, 1, true));
        world.schedule(7.6, () => {
            if (this.primaryTarget) {
                this.setPositionByVec(this.primaryTarget.positionRef);
                world.sendPacket(EntityPositionForceS2CPacket.create(this));
            }

            const exp = new ExplosionEntity(EntityTypes.EXPLOSION_ENTITY, world, 40);
            exp.setPositionByVec(this.positionRef);
            world.spawnEntity(exp);
        });

        world.schedule(9.6, () => {
            if (this.primaryTarget) {
                const selfPos = this.positionRef;
                const pos = this.primaryTarget.positionRef;
                this.setYaw(Math.atan2(pos.y - selfPos.y, pos.x - selfPos.x));

                world.sendPacket(EntityPositionForceS2CPacket.create(this));
            }

            this.dataTracker.set(DevourerBoss.RESET_SEG, true);
            world.sendPacket(new ScreenShakeS2CPacket(1.2, 1.5));
            world.sendPacket(new AudioLeapS2CPacket(9.6));
            this.enterPhase(DevourerPhase.PHASE_3, world);
        });
    }

    private updateSegmentPositions(): void {
        const pos = this.positionRef;

        this.segPoses[0] = pos.x;
        this.segPoses[1] = pos.y;
        this.prevSegPoses[0] = this.prevX;
        this.prevSegPoses[1] = this.prevY;

        for (let i = 1; i < this.segmentCount; i++) {
            const pIdx = (i - 1) << 1;
            const prevX = this.segPoses[pIdx];
            const prevY = this.segPoses[pIdx + 1];

            const idx = i << 1;
            const currX = this.segPoses[idx];
            const currY = this.segPoses[idx + 1];

            const dx = prevX - currX;
            const dy = prevY - currY;
            const distSq = dx * dx + dy * dy;
            if (distSq <= this.segmentSpacingSq) continue;
            const dist = Math.sqrt(distSq);
            const ratio = this.segmentSpacing / dist;

            this.prevSegPoses[idx] = currX;
            this.prevSegPoses[idx + 1] = currY;
            this.segPoses[idx] = prevX - dx * ratio;
            this.segPoses[idx + 1] = prevY - dy * ratio;
        }
    }

    public override canHitByProjectile(): boolean {
        return this.getPhase() !== DevourerPhase.PHASE_2_TO_3 && super.canHitByProjectile();
    }

    public override takeDamage(damageSource: DamageSource, damage: number): boolean {
        return super.takeDamage(damageSource, damage);
    }

    public override onDeath(damageSource: DamageSource): void {
        super.onDeath(damageSource);

        const world = this.getWorld() as ServerWorld;
        if (world.isClient) return;

        let times = 0;
        const pos = this.positionRef;
        const schedule = world.scheduleInterval(0.4, () => {
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

    public target() {
        return this.primaryTarget;
    }

    public getPhase(): DevourerPhase {
        return this.dataTracker.get(DevourerBoss.PHASE_TRACKER);
    }

    public override shouldRender(): boolean {
        return this.getPhase() !== DevourerPhase.PHASE_2_TO_3;
    }

    protected getMapOffsetX(): number {
        return 1E4;
    }

    protected override getMapOffsetY(): number {
        return 1E4;
    }

    public override onTrackedDataSet(data: TrackedData<any>): void {
        super.onTrackedDataSet(data);
        if (data === DevourerBoss.RESET_SEG) {
            this.restSeg();
        }
    }

    public override createSpawnPacket(): EntitySpawnS2CPacket {
        this.restSeg();
        return super.createSpawnPacket();
    }

    public override onSpawnPacket(packet: EntitySpawnS2CPacket): void {
        super.onSpawnPacket(packet);
        this.restSeg();
    }

    private restSeg(): void {
        const {x, y} = this.positionRef;
        for (let i = 0; i < this.segmentCount; i++) {
            const idx = i << 1;
            this.segPoses[idx] = x;
            this.segPoses[idx + 1] = y;
            this.prevSegPoses[idx] = x;
            this.prevSegPoses[idx + 1] = y;
        }
    }

    public override writeNBT(nbt: NbtCompound): NbtCompound {
        this.invulnerable = false;

        super.writeNBT(nbt);
        const phase = this.getPhase() === DevourerPhase.PHASE_2_TO_3 ? DevourerPhase.PHASE_2 : this.getPhase();
        nbt.setInt8('devourer_phase', phase);
        return nbt;
    }

    public override readNBT(nbt: NbtCompound): void {
        super.readNBT(nbt);
        this.currentPhase = nbt.getInt8('devourer_phase', DevourerPhase.PHASE_1) as DevourerPhase;
        this.dataTracker.set(DevourerBoss.PHASE_TRACKER, this.currentPhase);
    }
}
