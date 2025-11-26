import {Identifier} from "../registry/Identifier.ts";
import {Registry} from "../registry/Registry.ts";
import {Registries} from "../registry/Registries.ts";
import {SoundEvent} from "./SoundEvent.ts";

export class Audios {
    public static readonly SPACE_WALK = this.register('space_walk_mabo');
    public static readonly NO_MORE_MABO = this.register('no_more_mabo');
    public static readonly SOME_TIME_HJM = this.register('some_time_hjm');
    public static readonly DELTA_FORCE_THEME = this.register('delta_force_theme');
    public static readonly COME_ON_MABO = this.register('come_on_mabo');
    public static readonly MABO_2_23 = this.register('mabo_2_23');
    public static readonly MABO_3_30 = this.register('mabo_3_30');
    public static readonly ELE_MABO = this.register('ele_mabo');
    public static readonly IN_THE_SUMMER = this.register('in_the_summer');
    public static readonly MAKING_LEGENDS = this.register('making_legends');
    public static readonly VICTORY = this.register('victory');
    public static readonly WARSAW = this.register('warsaw');

    private static register(id: string) {
        const identifier = Identifier.ofVanilla(id);
        return Registry.registerReferenceById(Registries.AUDIOS, identifier, SoundEvent.of(identifier)).getValue();
    }
}