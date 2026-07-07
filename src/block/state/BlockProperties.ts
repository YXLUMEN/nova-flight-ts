import {SoundEvent} from "../../sound/SoundEvent.ts";
import {SoundEvents} from "../../sound/SoundEvents.ts";
import {Identifier} from "../../registry/Identifier.ts";

export class BlockProperties {
    public id: Identifier | null = null;

    /**
     * @test Only for demo
     * */
    public color: string = '#fff';
    public resistance: number = 0.5;
    public destroyTime: number = 6;

    public isRandomlyTicking: boolean = false;
    public soundEvent: SoundEvent = SoundEvents.EMPTY;

    public friction: number = 0.6;
    public speedFactor: number = 1;
    public jumpFactor: number = 1;

    public hasCollision: boolean = true;
    public canOcclude = true;
    public isAir: boolean = false;

    public static create() {
        return new BlockProperties();
    }

    /**
     * @test Only for demo
     * */
    public setColor(color: string) {
        this.color = color;
        return this;
    }

    public noCollision() {
        this.hasCollision = false;
        this.canOcclude = false;
        return this;
    }

    public noOcclusion() {
        this.canOcclude = false;
        return this;
    }

    public setFriction(value: number) {
        this.friction = Math.max(0, value);
        return this;
    }

    public setSpeedFactor(value: number) {
        this.speedFactor = Math.max(0, value);
        return this;
    }

    public setJumpFactor(value: number) {
        this.jumpFactor = Math.max(0, value);
        return this;
    }

    public sound(soundEvent: SoundEvent) {
        this.soundEvent = soundEvent;
        return this;
    }

    public strength(destroyTime: number, resistance: number) {
        return this.setDestroyTime(destroyTime).setResistance(resistance);
    }

    public setDestroyTime(value: number) {
        this.destroyTime = value;
        return this;
    }

    public setResistance(value: number) {
        this.resistance = Math.max(0, value);
        return this;
    }

    public randomTicks() {
        this.isRandomlyTicking = true;
        return this;
    }

    public air() {
        this.isAir = true;
        return this;
    }
}