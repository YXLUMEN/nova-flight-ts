import {Audios} from "./Audios.ts";
import {AudioManager} from "./AudioManager.ts";
import {EventBus} from "../event/EventBus.ts";
import {SoundQueue} from "./SoundQueue.ts";

export class BGMManager {
    private static readonly IN_GAME = new SoundQueue([
        Audios.AIR_MINUET,
        Audios.FRONTIER_SKIES,
        Audios.ZERG,
        Audios.UNBREAKABLE_WILL,
        Audios.WANA_HAVE_A_FLIGHT,
        Audios.ENCOUNTER,
        Audios.EASY_DAY_ALL_CLEAR,
    ]);
    private static readonly MAIN_THEME = new SoundQueue([
        Audios.HANGAR_SILENCE,
        Audios.THE_TALE_OF_A_CRUEL_WORLD,
        Audios.VICTORY,
    ]);
    private static readonly BOSS_PHASE = new SoundQueue([
        Audios.NO_MERCY,
        Audios.FIRING_ON_FULL_POWER,
        Audios.DUST2DUST,
        Audios.THE_FINAL_ASCENT,
    ]);

    public static init() {
        if (AudioManager.hasListener('main')) return;

        const nextTheme = async () => {
            await AudioManager.fadeOutAndPause();
            await AudioManager.play(this.MAIN_THEME.next());
        };

        const events = EventBus.instance();
        events.on('game:start', () => this.onGameStart());
        events.on('game:over', () => this.onGameOver());
        events.on('game:end', () => {
            AudioManager.removeListener('main');
            AudioManager.addListener('main', 'ended', nextTheme);
            nextTheme();
        });
        events.on('entity:boss:killed', () => this.onBossDead());
        AudioManager.addListener('main', 'ended', nextTheme);
        this.conditionListener(events);

        this.IN_GAME.shuffle();
        void AudioManager.play(this.MAIN_THEME.current());
    }

    public static async next() {
        await AudioManager.fadeOutAndPause();
        await AudioManager.play(this.IN_GAME.next());
    }

    public static async onGameStart() {
        const current = AudioManager.getCurrentPlaying();

        if (current === null || this.MAIN_THEME.indexOf(current) !== -1) {
            await AudioManager.fadeOutAndPause();
            await AudioManager.play(this.IN_GAME.current());
        }

        if (AudioManager.hasListener('bgm')) return;

        let last: number | undefined;
        AudioManager.removeListener('main');
        AudioManager.addListener('bgm', 'ended', () => {
            clearTimeout(last);
            last = setTimeout(() => {
                if (AudioManager.getCurrentPlaying() !== null) return;
                AudioManager.play(this.IN_GAME.next());
            }, 8000);
        });
    }

    public static async onGameOver() {
        await AudioManager.fadeOutAndPause();
        await AudioManager.play(Audios.KEEP_FIGHTING, false);
        AudioManager.leap(10);
    }

    public static async onBossSpawn(): Promise<void> {
        const shouldPlay = this.BOSS_PHASE.random();
        await AudioManager.fadeOutAndPause();
        await AudioManager.play(shouldPlay);
    }

    public static async onBossDead(): Promise<void> {
        await AudioManager.fadeOutAndPause();

        const rand = Math.random();
        if (rand < 0.1) await AudioManager.play(Audios.THE_TALE_OF_A_CRUEL_WORLD);
        else await AudioManager.play(this.IN_GAME.next());
    }

    private static conditionListener(events: EventBus) {
        this.IN_GAME.remove(Audios.TROPIC_THUNDER);
        this.IN_GAME.remove(Audios.TECHNOLOGY_CHANGES_THE_UNIVERSE);

        const offDiff = events.on('world:stage:difficult', async ({difficult}) => {
            if (difficult < 3) return false;
            offDiff();

            await AudioManager.fadeOutAndPause();
            const index = this.IN_GAME.randomInsert(Audios.TROPIC_THUNDER);
            const sound = this.IN_GAME.switch(index);
            await AudioManager.play(sound);
        });

        const offTech = events.on('player:tech:unlock', ({player}) => {
            if (player.getTechs().unloadedTechCount() <= 6) return;
            this.IN_GAME.randomInsert(Audios.TECHNOLOGY_CHANGES_THE_UNIVERSE);
            offTech();
        });
    }
}