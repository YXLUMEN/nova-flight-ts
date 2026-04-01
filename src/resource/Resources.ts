import {Registry} from "../registry/Registry.ts";
import {Registries} from "../registry/Registries.ts";
import {Identifier} from "../registry/Identifier.ts";

export class Resources {
    public static readonly LANG = this.registry('core.lang');
    public static readonly SOUND = this.registry('core.sound');
    public static readonly AUDIO = this.registry('core.audio');
    public static readonly TIP = this.registry('core.tip');
    public static readonly TEXTURE = this.registry('core.texture');

    private static registry(id: string) {
        return Registry.registerReferenceById(Registries.RESOURCES, Identifier.ofVanilla(id), id);
    }
}