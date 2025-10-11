import {EntitySpawnS2CPacket} from "../../network/packet/s2c/EntitySpawnS2CPacket.ts";
import type {Entity} from "../../entity/Entity.ts";
import {ClientWorld} from "../ClientWorld.ts";
import type {NovaFlightClient} from "../NovaFlightClient.ts";
import {JoinGameS2CPacket} from "../../network/packet/s2c/JoinGameS2CPacket.ts";
import {EntityTypes} from "../../entity/EntityTypes.ts";
import type {Consumer, UUID} from "../../apis/registry.ts";
import {EntityRemoveS2CPacket} from "../../network/packet/s2c/EntityRemoveS2CPacket.ts";
import {EntityPositionS2CPacket} from "../../network/packet/s2c/EntityPositionS2CPacket.ts";
import {MobAiS2CPacket} from "../../network/packet/s2c/MobAiS2CPacket.ts";
import {MobEntity} from "../../entity/mob/MobEntity.ts";
import {ExplosionS2CPacket} from "../../network/packet/s2c/ExplosionS2CPacket.ts";
import {EntityVelocityUpdateS2CPacket} from "../../network/packet/s2c/EntityVelocityUpdateS2CPacket.ts";
import {EntityTrackerUpdateS2CPacket} from "../../network/packet/s2c/EntityTrackerUpdateS2CPacket.ts";
import {
    EntityS2CPacket,
    MoveRelative,
    Rotate,
    RotateAndMoveRelative
} from "../../network/packet/s2c/EntityS2CPacket.ts";
import {decodeYaw} from "../../utils/NetUtil.ts";
import type {Payload, PayloadId} from "../../network/Payload.ts";
import type {NetworkChannel} from "../../network/NetworkChannel.ts";
import {ClientPlayerEntity} from "../entity/ClientPlayerEntity.ts";
import {ServerReadyS2CPacket} from "../../network/packet/s2c/ServerReadyS2CPacket.ts";
import {PlayerAttemptLoginC2SPacket} from "../../network/packet/c2s/PlayerAttemptLoginC2SPacket.ts";
import {EntityDamageS2CPacket} from "../../network/packet/s2c/EntityDamageS2CPacket.ts";
import {EntityKilledS2CPacket} from "../../network/packet/s2c/EntityKilledS2CPacket.ts";
import {ParticleS2CPacket} from "../../network/packet/s2c/ParticleS2CPacket.ts";
import {EntityAttributesS2CPacket} from "../../network/packet/s2c/EntityAttributesS2CPacket.ts";
import {LivingEntity} from "../../entity/LivingEntity.ts";
import {GaussianRandom} from "../../utils/math/GaussianRandom.ts";
import {MissileSetS2CPacket} from "../../network/packet/s2c/MissileSetS2CPacket.ts";
import {MissileEntity} from "../../entity/projectile/MissileEntity.ts";

export class ClientPlayNetworkHandler {
    private readonly loginPlayer = new Set<UUID>();
    private readonly client: NovaFlightClient;
    private readonly random = new GaussianRandom();
    private world: ClientWorld | null = null;

    public constructor(client: NovaFlightClient) {
        this.client = client;
        this.loginPlayer.add(this.client.clientId);
    }

    public onServerReady(_packet: ServerReadyS2CPacket) {
        this.client.networkChannel.send(new PlayerAttemptLoginC2SPacket(this.client.clientId));
    }

    public onGameJoin(packet: JoinGameS2CPacket) {
        this.world = new ClientWorld(this.client.registryManager);
        this.client.joinGame(this.world);
        if (this.client.player === null) {
            this.client.player = new ClientPlayerEntity(this.world, this.client.input);
            this.client.player.setYaw(-1.57079);
        }

        this.client.player.setUuid(this.client.clientId);
        this.client.player.setId(packet.playerEntityId);
        this.world.addEntity(this.client.player);
        this.world.setTicking(true);
    }

    public onEntity(packet: EntityS2CPacket) {
        const entity = this.world?.getEntityById(packet.entityId);
        if (!entity) return;
        if (!entity.isLogicalSideForUpdatingMovement()) return;

        if (packet.positionChanged) {
            const trackedPos = entity.getTrackedPosition();
            const deltaPos = trackedPos.withDelta(packet.deltaX, packet.deltaY);
            trackedPos.setPos(deltaPos.x, deltaPos.y);
            const yaw = packet.rotate ? packet.yaw : entity.getLerpTargetYaw();

            entity.updateTrackedPositionAndAngles(deltaPos.x, deltaPos.y, yaw, 3);
            return;
        }
        if (packet.rotate) {
            const yaw = decodeYaw(packet.yaw);
            entity.updateTrackedPositionAndAngles(entity.getLerpTargetX(), entity.getLerpTargetY(), yaw, 3);
        }
    }

    public onEntityPosition(packet: EntityPositionS2CPacket): void {
        const entity = this.world?.getEntityById(packet.entityId);
        if (!entity) return;

        entity.setTrackedPosition(packet.x, packet.y);
        if (!entity.isLogicalSideForUpdatingMovement()) {
            entity.updateTrackedPositionAndAngles(packet.x, packet.y, packet.yaw, 3);
        }
    }

    public onEntitySpawn(packet: EntitySpawnS2CPacket): void {
        const entity = this.createEntity(packet);
        if (!entity) return;

        entity.onSpawnPacket(packet);
        this.world!.addEntity(entity);
    }

    private createEntity(packet: EntitySpawnS2CPacket): Entity | null {
        const entityType = packet.entityType;
        if (entityType === EntityTypes.PLAYER) {
            if (this.loginPlayer.has(packet.uuid)) return null;
        }

        const world = this.world;
        if (!world) return null;
        return entityType.create(world);
    }

    public onEntityDamage(): void {
    }

    public onEntityKilled() {
    }

    public onEntityRemove(packet: EntityRemoveS2CPacket): void {
        this.world?.removeEntity(packet.id);
    }

    public onEntityVelocityUpdate(packet: EntityVelocityUpdateS2CPacket) {
        const entity = this.world?.getEntityById(packet.entityId);
        if (entity) {
            entity.setVelocityClient(packet.velocityX, packet.velocityY);
        }
    }

    public onEntityTrackerUpdate(packet: EntityTrackerUpdateS2CPacket): void {
        const entity = this.world?.getEntityById(packet.entityId);
        if (entity) {
            entity.getDataTracker().writeUpdatedEntries(packet.trackedValues);
        }
    }

    public onMobAiBehavior(packet: MobAiS2CPacket): void {
        const entity = this.world?.getEntityById(packet.id);
        if (!entity) return;
        (entity as MobEntity).setBehavior(packet.behavior);
    }

    public onExplosion(packet: ExplosionS2CPacket) {
        this.world?.createExplosion(null, null, packet.x, packet.y, {
            attacker: null,
            explosionRadius: packet.radius
        });
    }

    public onParticle(packet: ParticleS2CPacket): void {
        const world = this.world;
        if (!world) return;

        if (packet.count === 0) {
            const vx = packet.speed * packet.offsetX;
            const vy = packet.speed * packet.offsetY;
            world.addParticle(packet.posX, packet.posY, vx, vy, packet.life, packet.size, packet.colorFrom, packet.colorTo);
            return;
        }

        for (let i = packet.count; i--;) {
            const ox = this.random.nextGaussian() * packet.offsetX;
            const oy = this.random.nextGaussian() * packet.offsetY;
            const vx = this.random.nextGaussian() * packet.speed;
            const vy = this.random.nextGaussian() * packet.speed;
            world.addParticle(packet.posX + ox, packet.posY + oy, vx, vy, packet.life, packet.size, packet.colorFrom, packet.colorTo);
        }
    }

    public onEntityAttributes(packet: EntityAttributesS2CPacket): void {
        const entity = this.world?.getEntityById(packet.entityId);
        if (!entity) return;
        if (!(entity instanceof LivingEntity)) throw new Error(`Server tried to update attributes of a non-living entity: ${entity}`);
        const container = entity.getAttributes();

        for (const entry of packet.entries) {
            const instance = container.getCustomInstance(entry.attribute);
            if (!instance) {
                console.warn(`Entity ${entity} does not have attribute ${entry.attribute.getRegistryKey().getValue().toString()}`);
                continue;
            }
            instance.setBaseValue(entry.base);
            instance.clearModifiers();

            for (const modifier of entry.modifiers) {
                instance.addModifier(modifier);
            }
        }
    }

    public onMissileSet(packet: MissileSetS2CPacket): void {
        const missile = this.world?.getEntityById(packet.entityID);
        if (!missile) return;
        if (missile instanceof MissileEntity) {
            missile.driftAngle = packet.driftAngle;
            missile.hoverDir = packet.hoverDir;
        }
    }

    public registryHandler() {
        new PacketHandlerBuilder()
            .add(ServerReadyS2CPacket.ID, this.onServerReady)
            .add(JoinGameS2CPacket.ID, this.onGameJoin)
            .add(EntitySpawnS2CPacket.ID, this.onEntitySpawn)
            .add(EntityRemoveS2CPacket.ID, this.onEntityRemove)
            .add(EntityPositionS2CPacket.ID, this.onEntityPosition)
            .add(MobAiS2CPacket.ID, this.onMobAiBehavior)
            .add(ExplosionS2CPacket.ID, this.onExplosion)
            .add(EntityVelocityUpdateS2CPacket.ID, this.onEntityVelocityUpdate)
            .add(EntityTrackerUpdateS2CPacket.ID, this.onEntityTrackerUpdate)
            .add(Rotate.ID, this.onEntity)
            .add(MoveRelative.ID, this.onEntity)
            .add(RotateAndMoveRelative.ID, this.onEntity)
            .add(EntityKilledS2CPacket.ID, this.onEntityKilled)
            .add(EntityDamageS2CPacket.ID, this.onEntityDamage)
            .add(ParticleS2CPacket.ID, this.onParticle)
            .add(EntityAttributesS2CPacket.ID, this.onEntityAttributes)
            .add(MissileSetS2CPacket.ID, this.onMissileSet)
            .register(this.client.networkChannel, this);
    }
}

class PacketHandlerBuilder {
    private handlers: Array<[PayloadId<any>, Consumer<any>]> = [];

    public add<T extends Payload>(packetType: PayloadId<any>, handler: Consumer<T>): this {
        this.handlers.push([packetType, handler]);
        return this;
    }

    public register(channel: NetworkChannel, context: any): void {
        for (const [id, handler] of this.handlers) {
            channel.receive(id, handler.bind(context));
        }
    }
}