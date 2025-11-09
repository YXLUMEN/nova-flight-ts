import type {ServerCommandSource} from "../server/command/ServerCommandSource.ts";
import type {Entity} from "../entity/Entity.ts";
import {getNearestEntity, randInt} from "./math/math.ts";

export class EntitySelector {
    private static baseSelector = ['@s', '@p', '@a', '@r', '@e'];

    public static isValidateSelector(selector: string): boolean {
        return this.baseSelector.includes(selector);
    }

    public static parse(selector: string, source: ServerCommandSource): Entity[] | null {
        switch (selector) {
            case '@s':
                return source.entity ? [source.entity] : null;
            case '@p': {
                const world = source.getWorld();
                if (!world) throw new ReferenceError('World not found');
                const nearest = getNearestEntity(source.position, world.getPlayers());
                return nearest ? [nearest] : null;
            }
            case '@a': {
                const world = source.getWorld();
                if (!world) throw new ReferenceError('World not found');
                const allPlayer = [...world.getPlayers()];
                if (allPlayer.length === 0) return null;
                return allPlayer;
            }
            case '@r': {
                const world = source.getWorld();
                if (!world) throw new ReferenceError('World not found');
                const allPlayer = [...world.getPlayers()];
                if (allPlayer.length === 0) return null;

                return [allPlayer[randInt(0, allPlayer.length)]];
            }
            case '@e': {
                const world = source.getWorld();
                if (!world) throw new ReferenceError('World not found');
                const allEntities = world.getEntities().values().toArray();
                if (allEntities.length === 0) return null;
                return allEntities;
            }
        }

        return null;
    }
}