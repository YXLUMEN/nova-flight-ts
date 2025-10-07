import {EntitySpawnS2CPacket} from "../../network/packet/s2c/EntitySpawnS2CPacket.ts";
import type {Entity} from "../../entity/Entity.ts";
import {ClientWorld} from "../ClientWorld.ts";
import type {NovaFlightClient} from "../NovaFlightClient.ts";
import {JoinGameS2CPacket} from "../../network/packet/s2c/JoinGameS2CPacket.ts";
import {EntityTypes} from "../../entity/EntityTypes.ts";
import type {UUID} from "../../apis/registry.ts";
import {EntityHealthS2CPacket} from "../../network/packet/s2c/EntityHealthS2CPacket.ts";
import type {LivingEntity} from "../../entity/LivingEntity.ts";
import {EntityRemoveS2CPacket} from "../../network/packet/s2c/EntityRemoveS2CPacket.ts";
import {EntityPositionS2CPacket} from "../../network/packet/s2c/EntityPositionS2CPacket.ts";
import {MobAiS2CPacket} from "../../network/packet/s2c/MobAiS2CPacket.ts";
import type {MobEntity} from "../../entity/mob/MobEntity.ts";
import {ExplosionS2CPacket} from "../../network/packet/s2c/ExplosionS2CPacket.ts";

export class ClientPlayNetworkHandler {
    private readonly loginPlayer = new Set<UUID>();
    private readonly client: NovaFlightClient;
    private world: ClientWorld | null = null;

    public constructor(client: NovaFlightClient) {
        this.client = client;
    }

    public onGameJoin() {
        console.log("Client joined");
        this.world = new ClientWorld(this.client.registryManager);
        this.client.joinGame(this.world);
        this.world.setTicking(true);
        if (this.client.player) {
            this.loginPlayer.add(this.client.player.getUuid());
        }
    }

    public onEntitySpawn(packet: EntitySpawnS2CPacket): void {
        const entity = this.createEntity(packet);
        if (!entity) return;
        entity.onSpawnPacket(packet);
        entity.updatePosAndYaw();
        this.world!.addEntity(entity);
    }

    private createEntity(packet: EntitySpawnS2CPacket): Entity | null {
        const entityType = packet.entityType;
        if (entityType === EntityTypes.PLAYER_ENTITY) {
            if (this.loginPlayer.has(packet.uuid)) return null;
        }

        return entityType.create(this.world!);
    }

    public onEntityHealthChange(packet: EntityHealthS2CPacket): void {
        const entity = this.world!.getEntityById(packet.id);
        if (!entity) return;
        (entity as LivingEntity).setHealth(packet.amount);
        if (!entity.isAlive()) entity.discard();
    }

    public onEntityRemove(packet: EntityRemoveS2CPacket): void {
        this.world?.removeEntity(packet.id);
    }

    public onEntityPosition(packet: EntityPositionS2CPacket): void {
        const entity = this.world!.getEntityById(packet.entityId);
        if (!entity) return;

        entity.setPosition(packet.x, packet.y);
        entity.setYaw(packet.yaw);
        entity.updatePosAndYaw();
    }

    public onMobAiBehavior(packet: MobAiS2CPacket): void {
        const entity = this.world!.getEntityById(packet.id);
        if (!entity) return;
        (entity as MobEntity).setBehavior(packet.behavior);
    }

    public onExplosion(packet: ExplosionS2CPacket) {
        this.world?.createExplosion(null, null, packet.x, packet.y, {
            attacker: null,
            explosionRadius: packet.radius
        });
    }

    public registryHandler() {
        this.client.networkChannel.receive(JoinGameS2CPacket.ID, this.onGameJoin.bind(this));
        this.client.networkChannel.receive(EntitySpawnS2CPacket.ID, this.onEntitySpawn.bind(this));
        this.client.networkChannel.receive(EntityRemoveS2CPacket.ID, this.onEntityRemove.bind(this));
        this.client.networkChannel.receive(EntityPositionS2CPacket.ID, this.onEntityPosition.bind(this));
        this.client.networkChannel.receive(EntityHealthS2CPacket.ID, this.onEntityHealthChange.bind(this));
        this.client.networkChannel.receive(MobAiS2CPacket.ID, this.onMobAiBehavior.bind(this));
        this.client.networkChannel.receive(ExplosionS2CPacket.ID, this.onExplosion.bind(this));
    }
}