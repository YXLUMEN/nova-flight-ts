import {Registry} from "../../registry/Registry.ts";
import {Registries} from "../../registry/Registries.ts";
import {Identifier} from "../../registry/Identifier.ts";

export class Resources {
    public static readonly LANG = this.registry('lang');
    public static readonly SOUND = this.registry('sound');
    public static readonly AUDIO = this.registry('audio');
    public static readonly TIP = this.registry('tip');
    public static readonly TEXTURE = this.registry('texture');
    public static readonly MODEL = this.registry('model');

    private static registry(id: string) {
        return Registry.registerReferenceById(Registries.RESOURCES, Identifier.ofVanilla(id), id);
    }
}