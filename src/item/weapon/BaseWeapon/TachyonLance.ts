import {ParticleLance} from "./ParticleLance.ts";

export class TachyonLance extends ParticleLance {
    public override getUiColor(): string {
        return '#b0ddff';
    }

    public override getDisplayName(): string {
        return '快子光矛';
    }
}