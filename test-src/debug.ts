// 创建一个监控系统
import type {Entity} from "../src/entity/Entity.ts";

type EntityInfo = {
    id: number;
    isClient: boolean;
};

export class EntityGCWatchdog {
    private static registry = new FinalizationRegistry<EntityInfo>((info) => {
        const remain = this.checkAlive().length;
        console.log(`[${info.isClient ? 'Client' : 'Server'}] 实体 ID ${info.id} 已被垃圾回收, 剩余: ${remain}`);
    });

    private static weakRefs = new Map<number, WeakRef<Entity>>();

    public static watch(entity: Entity): void {
        const weakRef = new WeakRef(entity);
        this.weakRefs.set(entity.getId(), weakRef);
        // 注册终结器：当entity对象被GC时，会调用上面的回调函数
        this.registry.register(entity, {id: entity.getId(), isClient: entity.getWorld().isClient});
    }

    // 检查哪些实体还没被GC
    public static checkAlive(): Entity[] {
        const stillAlive: Entity[] = [];
        for (const weakRef of this.weakRefs.values()) {
            const entity = weakRef.deref();
            if (entity) {
                stillAlive.push(entity);
            }
        }
        return stillAlive;
    }
}

export function afterReset() {
    const aliveEntities = EntityGCWatchdog.checkAlive();
    if (aliveEntities.length > 0) {
        console.warn("重置后仍有实体未被回收：", aliveEntities);
    }
}