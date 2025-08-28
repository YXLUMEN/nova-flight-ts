import {MutVec2} from "../utils/math/MutVec2.ts";
import type {TrackedData} from "./data/TrackedData.ts";
import {type World} from "../World.ts";
import {Vec2} from "../utils/math/Vec2.ts";
import type {DamageSource} from "./damage/DamageSource.ts";
import type {Weapon} from "../weapon/Weapon.ts";
import type {EntityType} from "./EntityType.ts";
import type {EntityDimensions} from "./EntityDimensions.ts";
import {DataTracker} from "./data/DataTracker.ts";
import type {DataTracked} from "./data/DataTracked.ts";
import type {DataEntry} from "./data/DataEntry.ts";


export abstract class Entity implements DataTracked {
    private readonly type: EntityType<any>
    private readonly world: World;
    private readonly pos: MutVec2;
    private readonly dimensions: EntityDimensions;
    private velocity: Vec2 = Vec2.ZERO;

    protected readonly dataTracker: DataTracker;

    public speed: number = 0;
    public invulnerable: boolean = false;
    private dead: boolean = false;

    protected constructor(type: EntityType<any>, world: World) {
        this.type = type;
        this.world = world;

        this.pos = MutVec2.zero();
        this.dimensions = type.getDimensions();

        const builder = new DataTracker.Builder(this);
        this.initDataTracker(builder);
        this.dataTracker = builder.build();
    }

    public getWorld(): World {
        return this.world;
    }

    public tick(_dt: number): void {
    }

    public isInvulnerableTo(damageSource: DamageSource): boolean {
        return this.dead || this.invulnerable && !damageSource.isIn();
    }

    public takeDamage(damageSource: DamageSource, _amount: number): boolean {
        return this.isInvulnerableTo(damageSource);
    }

    public onDeath(_damageSource: DamageSource): void {
        this.discard();
    }

    public discard(): void {
        this.dead = true;
    }

    public isDead(): boolean {
        return this.dead;
    }

    public getWeaponStack(): Weapon | null {
        return null;
    }

    public getEntityWidth(): number {
        return this.dimensions.width;
    }

    public getEntityHeight(): number {
        return this.dimensions.height;
    }

    public calculateBoundingBox() {
        return this.dimensions.getBoxAtByVec(this.pos);
    }

    public get getMutPos(): MutVec2 {
        return this.pos;
    }

    public setPosByVec(pos: Vec2 | MutVec2): void {
        this.pos.x = pos.x;
        this.pos.y = pos.y;
    }

    public setPos(x: number, y: number): void {
        this.pos.x = x;
        this.pos.y = y;
    }

    public getPos(): Vec2 {
        return Vec2.formVec(this.pos);
    }

    public getVelocity(): Vec2 {
        return this.velocity;
    }

    public setVelocity(velocity: Vec2): void {
        this.velocity = velocity;
    }

    public getType(): EntityType<any> {
        return this.type;
    }

    public abstract render(ctx: CanvasRenderingContext2D): void;

    protected abstract initDataTracker(builder: InstanceType<typeof DataTracker.Builder>): void;

    public abstract onDataTrackerUpdate(entries: DataEntry<any>): void;

    public abstract onTrackedDataSet(data: TrackedData<any>): void;
}