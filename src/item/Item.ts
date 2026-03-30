import type {World} from "../world/World.ts";
import type {Entity} from "../entity/Entity.ts";
import type {RegistryEntry} from "../registry/tag/RegistryEntry.ts";
import type {PlayerEntity} from "../entity/player/PlayerEntity.ts";
import {ItemStack} from "./ItemStack.ts";
import type {LivingEntity} from "../entity/LivingEntity.ts";
import {SimpleComponentMap} from "../component/SimpleComponentMap.ts";
import {DataComponents} from "../component/DataComponents.ts";
import type {DataComponentType} from "../component/DataComponentType.ts";
import type {ComponentMap} from "../component/ComponentMap.ts";
import {Registries} from "../registry/Registries.ts";
import {BitFlag} from "../utils/BitFlag.ts";
import {createTranslationKey} from "../utils/uit.ts";
import {TranslatableText} from "../i18n/TranslatableText.ts";
import type {ServerWorld} from "../server/ServerWorld.ts";

export type ItemProperties = InstanceType<typeof Item.Properties>;

export class Item {
    public static readonly Properties = class Properties {
        private components: SimpleComponentMap | null = null;

        public maxCount(maxCount: number): this {
            return this.component(DataComponents.MAX_STACK_SIZE, maxCount);
        }

        public maxDurability(maxDurability: number): this {
            this.component(DataComponents.MAX_DURABILITY, maxDurability);
            this.component(DataComponents.MAX_STACK_SIZE, 1);
            return this.component(DataComponents.DURABILITY, maxDurability);
        }

        public attackDamage(damage: number): this {
            return this.component(DataComponents.ATTACK_DAMAGE, damage);
        }

        public maxCooldown(maxCooldown: number): this {
            this.component(DataComponents.MAX_COOLDOWN, maxCooldown)
            return this.component(DataComponents.COOLDOWN, 0);
        }

        public unbreakable(): this {
            return this.component(DataComponents.UNBREAKABLE, true);
        }

        public type(...type: number[]): this {
            return this.component(DataComponents.WEAPON_TYPE, BitFlag.combine(...type));
        }

        public component<T>(type: DataComponentType<T>, value: T): this {
            if (this.components === null) {
                this.components = this.getComponents();
            }

            this.components.set(type, value);
            return this;
        }

        public getValidatedComponents(): SimpleComponentMap {
            const componentMap = this.getComponents();
            if (componentMap.has(DataComponents.DURABILITY) &&
                componentMap.getOrDefault(DataComponents.MAX_STACK_SIZE, 1) > 1) {
                throw Error("Item cannot have both durability and be stackable");
            }
            return componentMap;
        }

        private getComponents() {
            if (this.components === null) {
                const com = new SimpleComponentMap();
                com.set(DataComponents.MAX_STACK_SIZE, 1);
                com.set(DataComponents.ITEM_AVAILABLE, true);
                this.components = com;
            }
            return this.components;
        }
    }

    public readonly registryEntry!: RegistryEntry<Item>;
    private readonly components: SimpleComponentMap;

    private translation: TranslatableText | null = null;

    public constructor(settings: ItemProperties) {
        this.components = settings.getValidatedComponents();
    }

    public static getIndex(item: Item | null) {
        return item === null ? 0 : Registries.ITEM.getIndex(item);
    }

    public getRegistryEntry(): RegistryEntry<Item> {
        return this.registryEntry;
    }

    public getComponents(): ComponentMap {
        return this.components;
    }

    public getDefaultStack() {
        return new ItemStack(this);
    }

    public inventoryTick(_stack: ItemStack, _world: ServerWorld, _holder: Entity, _slot: number, _selected: boolean): void {
    }

    public leftClick(_world: World, _user: PlayerEntity): boolean {
        return false;
    }

    public postHit(_stack: ItemStack, _target: LivingEntity, _attacker: LivingEntity): boolean {
        return false;
    }

    public onUseTick(_world: World, _user: PlayerEntity): boolean {
        return false;
    }

    public getDisplayName(): string {
        return "Item";
    }

    public getName(): TranslatableText {
        if (this.translation === null) {
            this.translation = TranslatableText.of(createTranslationKey('item', Registries.ITEM.getId(this)))
        }

        return this.translation;
    }

    public toString() {
        return Registries.ITEM.getEntryByValue(this)?.toString() ?? this.getDisplayName();
    }
}
