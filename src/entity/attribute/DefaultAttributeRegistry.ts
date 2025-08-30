import {DefaultAttributeContainer} from "./DefaultAttributeContainer.ts";
import {EntityAttributes} from "./EntityAttributes.ts";

export class DefaultAttributeRegistry {
    private static readonly DEFAULT_ATTRIBUTE_REGISTRY = new Map<string, DefaultAttributeContainer>([
        ['BaseEnemy', createBaseEnemyAttribute(2).build()],
        ['BossEntity', createBaseEnemyAttribute(160).build()],
        ['GunEnemyEntity', createBaseEnemyAttribute(4).build()],
        ['MiniGunEnemyEntity', createBaseEnemyAttribute(64).build()],
        ['TankEnemy', createBaseEnemyAttribute(32).build()],
        ['PlayerEntity', createPlayerAttribute().build()]
    ]);

    public static get(type: string): DefaultAttributeContainer {
        return this.DEFAULT_ATTRIBUTE_REGISTRY.get(type)!;
    }
}

function createLivingAttributes() {
    return DefaultAttributeContainer.builder()
        .add(EntityAttributes.GENERIC_MAX_HEALTH);
}

function createPlayerAttribute() {
    return createLivingAttributes()
        .addWithBaseValue(EntityAttributes.GENERIC_MAX_HEALTH, 3);
}

function createBaseEnemyAttribute(hp: number) {
    return createLivingAttributes()
        .addWithBaseValue(EntityAttributes.GENERIC_MAX_HEALTH, hp);
}