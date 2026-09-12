import {Identifier} from "../registry/Identifier.ts";
import {Registry} from "../registry/Registry.ts";
import {Registries} from "../registry/Registries.ts";
import {SoundEvent} from "./SoundEvent.ts";

export class Audios {
    // OST 1
    public static readonly MAIN_THEME = this.register('main_theme');
    public static readonly NO_MERCY = this.register('no_mercy');
    public static readonly ENCOUNTER = this.register('encounter');
    public static readonly FIRING_ON_FULL_POWER = this.register('firing_on_full_power');
    public static readonly KEEP_FIGHTING = this.register('keep_fighting');
    public static readonly TECHNOLOGY_CHANGES_THE_UNIVERSE = this.register('technology_changes_the_universe');
    public static readonly WE_MADE_IT = this.register('we_made_it');
    public static readonly ZERG = this.register('zerg');

    // OST 2
    public static readonly AIR_MINUET = this.register('air_minuet');
    public static readonly DUST2DUST = this.register('dust_to_dust');
    public static readonly FRONTIER_SKIES = this.register('frontier_skies');
    public static readonly HANGAR_SILENCE = this.register('hangar_silence');
    public static readonly THE_FINAL_ASCENT = this.register('the_final_ascent');
    public static readonly UNBREAKABLE_WILL = this.register('unbreakable_will');
    public static readonly WANA_HAVE_A_FLIGHT = this.register('wana_have_a_flight');

    public static readonly DELTA_FORCE_THEME = this.register('delta_force_theme');
    public static readonly STEEL_REQUIEM = this.register('steel_requiem');
    public static readonly TROPIC_THUNDER = this.register('tropic_thunder');

    public static readonly VICTORY = this.register('victory');
    public static readonly WARSAW = this.register('warsaw');

    public static readonly SCOURGE_OF_THE_UNIVERSE = this.register('scourge_of_the_universe');
    public static readonly UNIVERSAL_COLLAPSE = this.register('universal_collapse');
    public static readonly THE_TALE_OF_A_CRUEL_WORLD = this.register('the_tale_of_a_cruel_world');

    private static register(id: string) {
        const identifier = Identifier.ofVanilla(id);
        return Registry.registerReferenceById(Registries.AUDIOS, identifier, SoundEvent.of(identifier)).getValue();
    }
}