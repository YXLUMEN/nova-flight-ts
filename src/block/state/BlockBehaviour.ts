import {BlockProperties} from "./BlockProperties.ts";
import {SoundEvent} from "../../sound/SoundEvent.ts";
import {BlockState} from "./BlockState.ts";
import type {World} from "../../world/World.ts";
import type {BlockPos} from "../../world/section/pos/BlockPos.ts";

export abstract class BlockBehaviour {
    /**
     * @test Only for demo
     * */
    public readonly color: string;

    protected readonly hasCollision: boolean;

    protected readonly resistance: number;
    protected readonly randomTicking: boolean;
    protected readonly soundEvent: SoundEvent;

    protected readonly friction: number;
    protected readonly speedFactor: number;
    protected readonly jumpFactor: number;

    protected readonly properties: BlockProperties;

    protected constructor(properties: BlockProperties) {
        this.color = properties.color;
        this.hasCollision = properties.hasCollision;
        this.resistance = properties.resistance;
        this.randomTicking = properties.isRandomlyTicking;
        this.soundEvent = properties.soundEvent;
        this.friction = properties.friction;
        this.speedFactor = properties.speedFactor;
        this.jumpFactor = properties.jumpFactor;

        this.properties = properties;
    }

    public getProperties() {
        return this.properties;
    }

    public isRandomlyTicking(_state: BlockState): boolean {
        return this.randomTicking;
    }

    public onPlace(_world: World, _pos: BlockPos, _state: BlockState, _oldState: BlockState): void {
    }
}