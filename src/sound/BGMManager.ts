import {Audios} from "./Audios.ts";
import {AudioManager} from "./AudioManager.ts";
import {randomChose, shuffleArray} from "../utils/uit.ts";
import type {SoundEvent} from "./SoundEvent.ts";
import type {ClientPlayerEntity} from "../client/entity/ClientPlayerEntity.ts";
import {clamp, randInt} from "../utils/math/math.ts";
import {EventBus} from "../event/EventBus.ts";

export class BGMManager {
    private static readonly playList = [
        Audios.AIR_MINUET,
        Audios.FRONTIER_SKIES,
        Audios.ZERG,
        Audios.THE_FINAL_ASCENT,
        Audios.UNBREAKABLE_WILL,
        Audios.WANA_HAVE_A_FLIGHT,
    ];
    private static readonly mainTheme = [
        Audios.HANGAR_SILENCE,
        Audios.THE_TALE_OF_A_CRUEL_WORLD,
        Audios.VICTORY
    ];
    private static themeIndex = 0;

    private static current = 0;
    private static addDifficulty = false;
    private static addTech = false;

    public static init() {
        this.nextTheme = this.nextTheme.bind(this);

        const events = EventBus.instance();
        events.on('game:start', () => {
            void this.onGameStart();
        });
        events.on('game:end', this.nextTheme);
        events.on('game:over', () => {
            void this.onGameOver();
        });
        AudioManager.addListener('main', 'ended', this.nextTheme);

        shuffleArray(this.playList);
        void AudioManager.playAudio(this.mainTheme[0]);
    }

    public static nextTheme() {
        this.themeIndex = (this.themeIndex + 1) % this.mainTheme.length;
        void AudioManager.playAudio(this.mainTheme[this.themeIndex]);
    }

    public static next() {
        this.current = (this.current + 1) % this.playList.length;
        void AudioManager.playAudio(this.playList[this.current]);
    }

    private static async onGameStart() {
        const current = AudioManager.getCurrentPlaying();
        if (current === null || this.mainTheme.includes(current)) {
            await AudioManager.fadeOutAndPause();
            await AudioManager.playAudio(this.playList[this.current]);
        }

        if (AudioManager.hasListener('bgm')) return;

        let last: number | undefined;
        AudioManager.removeListener('main');
        AudioManager.addListener('bgm', 'ended', () => {
            clearTimeout(last);
            last = setTimeout(() => {
                if (AudioManager.getCurrentPlaying() !== null) return;
                this.next();
            }, 8000);
        });
    }

    private static async onGameOver() {
        await AudioManager.fadeOutAndPause();

        if (Math.random() < 0.5) {
            await AudioManager.playAudio(Audios.KEEP_FIGHTING, false);
            AudioManager.leap(10);
            return;
        }

        await AudioManager.playAudio(Audios.DUST2DUST, false)
    }

    public static onBossSpawn(): void {
        const shouldPlay = randomChose([Audios.NO_MERCY, Audios.FIRING_ON_FULL_POWER, Audios.ENCOUNTER]);
        AudioManager.fadeOutAndPause()
            .then(() => AudioManager.playAudio(shouldPlay));
    }

    public static onBossDead(): void {
        AudioManager.fadeOutAndPause().then(() => {
            const rand = Math.random();
            if (rand < 0.5) void AudioManager.playAudio(Audios.THE_TALE_OF_A_CRUEL_WORLD);
            else this.next();
        });
    }

    public static onDifficultRaise(difficulty: number) {
        if (this.addDifficulty || difficulty < 3) return;
        this.addDifficulty = true;

        AudioManager.fadeOutAndPause().then(() => {
            const index = this.randomInsertAudio(Audios.TROPIC_THUNDER);
            this.current = clamp(index, 0, this.playList.length - 1);
            return AudioManager.playAudio(this.playList[this.current]);
        })
    }

    public static onTechUnlock(player: ClientPlayerEntity): void {
        if (this.addTech || player.getTechs().unloadedTechCount() <= 6) return;
        this.addTech = true;
        this.randomInsertAudio(Audios.TECHNOLOGY_CHANGES_THE_UNIVERSE);
    }

    private static randomInsertAudio(audio: SoundEvent) {
        const insertIndex = randInt(0, this.playList.length);
        this.playList.splice(insertIndex, 0, audio);
        return insertIndex;
    }
}