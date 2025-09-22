import type {World} from "../world/World.ts";
import type {Entity} from "../entity/Entity.ts";
import {Registries} from "../registry/Registries.ts";
import type {RegistryEntry} from "../registry/tag/RegistryEntry.ts";
import type {PlayerEntity} from "../entity/player/PlayerEntity.ts";
import type {ItemStack} from "./ItemStack.ts";
import type {LivingEntity} from "../entity/LivingEntity.ts";
import {ComponentMap} from "../component/ComponentMap.ts";
import {DataComponentTypes} from "../component/DataComponentTypes.ts";
import type {ComponentType} from "../component/ComponentType.ts";

export type ItemSettings = InstanceType<typeof Item.Settings>;

export class Item {
    private readonly registryEntry = Registries.ITEM.getEntryByValue(this)!;
    private readonly components: ComponentMap;

    public constructor(settings: ItemSettings) {
        this.components = settings.getValidatedComponents();
    }

    public inventoryTick(_stack: ItemStack, _world: World, _holder: Entity): void {
    }

    public getRegistryEntry(): RegistryEntry<Item> {
        return this.registryEntry;
    }

    public getComponents(): ComponentMap {
        return this.components;
    }

    public leftClick(_world: World, _user: PlayerEntity): boolean {
        return false;
    }

    public postHit(_stack: ItemStack, _target: LivingEntity, _attacker: LivingEntity): boolean {
        return false;
    }

    public rightClick(_world: World, _user: PlayerEntity): boolean {
        return false;
    }

    public getDisplayName(): string {
        return "Item";
    }

    public static readonly Settings = class Settings {
        private components: ComponentMap | null = null;

        public maxCount(maxCount: number): this {
            return this.component(DataComponentTypes.MAX_STACK_SIZE, maxCount);
        }

        public maxDurability(maxDamage: number): this {
            this.component(DataComponentTypes.MAX_DURABILITY, maxDamage);
            this.component(DataComponentTypes.MAX_STACK_SIZE, 1);
            return this.component(DataComponentTypes.DURABILITY, 0);
        }

        public attackDamage(damage: number): this {
            return this.component(DataComponentTypes.ATTACK_DAMAGE, damage);
        }

        public maxCooldown(maxCooldown: number): this {
            this.component(DataComponentTypes.MAX_COOLDOWN, maxCooldown)
            return this.component(DataComponentTypes.COOLDOWN, 0);
        }

        public component<T>(type: ComponentType<T>, value: T): this {
            if (this.components === null) {
                this.components = this.getComponents();
            }

            this.components.set(type, value);
            return this;
        }

        private getComponents() {
            if (this.components === null) {
                const com = new ComponentMap();
                com.set(DataComponentTypes.MAX_STACK_SIZE, 1);
                com.set(DataComponentTypes.ITEM_AVAILABLE, true);
                this.components = com;
            }
            return this.components;
        }

        public getValidatedComponents(): ComponentMap {
            const componentMap = this.getComponents();
            if (componentMap.has(DataComponentTypes.DURABILITY) &&
                componentMap.getOrDefault(DataComponentTypes.MAX_STACK_SIZE, 1) > 1) {
                throw Error("Item cannot have both durability and be stackable");
            }
            return componentMap;
        }
    }
}
