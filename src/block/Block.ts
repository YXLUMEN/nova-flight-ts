import type {BlockSettings} from "./BlockSettings.ts";

export class Block {
    protected readonly collidable: boolean;
    protected readonly resistance: number;
    protected readonly velocityMultiplier;
    protected readonly isAir: boolean;
    protected readonly settings: BlockSettings;

    public constructor(settings: BlockSettings) {
        this.collidable = settings.collidable;
        this.resistance = settings.resistance;
        this.velocityMultiplier = settings.velocityMultiplier;
        this.isAir = settings.isAir;
        this.settings = settings;
    }

    public getSettings() {
        return this.settings;
    }
}