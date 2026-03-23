export class BlockSettings {
    public collidable: boolean = true;
    public resistance: number = 0.5;
    public velocityMultiplier: number = 1;
    public isAir: boolean = false;

    private constructor() {
    }

    public static create() {
        return new BlockSettings();
    }

    public noCollided() {
        this.collidable = false;
        return this;
    }

    public withVelocityMulti(value: number) {
        this.velocityMultiplier = Math.max(0, value);
        return this;
    }

    public withResistance(value: number) {
        this.resistance = Math.max(0, value);
        return this;
    }

    public air() {
        this.isAir = true;
        return this;
    }
}