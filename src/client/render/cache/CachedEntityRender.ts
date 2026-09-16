import type {Entity} from "../../../entity/Entity.ts";
import type {EntityRenderer} from "../entity/EntityRenderer.ts";
import type {Vec2} from "../../../utils/math/Vec2.ts";
import {CachedSpriteRenderer} from "./CachedSpriteRenderer.ts";


export abstract class CachedEntityRender<K, E extends Entity> extends CachedSpriteRenderer<K, E> implements EntityRenderer<E> {
    protected getAnchor(entity: E, alpha: number): Vec2 {
        return entity.getLerpPos(alpha);
    }
}