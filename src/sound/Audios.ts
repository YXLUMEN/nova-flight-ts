import {Identifier} from "../registry/Identifier.ts";
import {Registry} from "../registry/Registry.ts";
import {Registries} from "../registry/Registries.ts";
import {SoundEvent} from "./SoundEvent.ts";

export class Audios {
    public static readonly SPACE_WALK = this.register('bgm.1');
    public static readonly NO_MORE_MABO = this.register('bgm.2');
    public static readonly SOME_TIME_HJM = this.register('bgm.3');
    public static readonly DELTA_FORCE_MAIN = this.register('bgm.4');
    public static readonly COME_ON_MABO = this.register('bgm.5');

    private static register(id: string) {
        const identifier = Identifier.ofVanilla(id);
        return Registry.registerReferenceById(Registries.AUDIOS, identifier, SoundEvent.of(identifier)).getValue();
    }
}