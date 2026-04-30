import {Audios} from "./Audios.ts";
import {AudioManager} from "./AudioManager.ts";
import {shuffleArray} from "../utils/uit.ts";
import type {SoundEvent} from "./SoundEvent.ts";
import type {ClientPlayerEntity} from "../client/entity/ClientPlayerEntity.ts";
import {clamp, randInt} from "../utils/math/math.ts";

export class BGMManager {
    private static readonly playList = [
        Audios.VOID_SHOWDOWN,
        Audios.MAKING_LEGENDS,
        Audios.STEEL_REQUIEM,
        Audios.COME_ON_MABO,
        Audios.LAVA_CHICKEN,
        Audios.ZERG
    ];
    private static readonly mainTheme = [
        Audios.MAIN_THEME,
        Audios.THE_TALE_OF_A_CRUEL_WORLD,
        Audios.DELTA_FORCE_THEME,
        Audios.WARSAW
    ];

    private static current = 0;

    private static addDifficulty = false;
    private static addTech = false;

    public static init() {
        shuffleArray(this.playList);
        this.playMainTheme();
    }

    public static playMainTheme() {
        if (!AudioManager.isPaused()) return;

        let index = randInt(0, this.mainTheme.length - 1);
        AudioManager.playAudio(this.mainTheme[index]);

        AudioManager.removeListener('main');
        AudioManager.addListener('main', 'ended', () => {
            const i = (index + 1) % this.mainTheme.length;
            AudioManager.playAudio(this.mainTheme[i]);
        });
    }

    public static next() {
        this.current = (this.current + 1) % this.playList.length;
        AudioManager.playAudio(this.playList[this.current]);
    }

    public static async onGameStart() {
        const current = AudioManager.getCurrentPlaying();
        if (current === null || this.mainTheme.includes(current)) {
            await AudioManager.fadeOutAndPause();
            AudioManager.playAudio(this.playList[this.current]);
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

    public static onGameOver() {
        AudioManager.fadeOutAndPause()
            .then(() => AudioManager.playAudio(Audios.KEEP_FIGHTING, false))
            .then(() => AudioManager.leap(10));
    }

    public static onBossSpawn(): void {
        let shouldPlay: SoundEvent;

        const rand = Math.random();
        if (rand < 0.3) shouldPlay = Audios.NO_MERCY;
        else if (rand >= 0.3 && rand < 0.6) shouldPlay = Audios.FIRING_ON_FULL_POWER;
        else shouldPlay = Audios.ENCOUNTER;

        AudioManager.fadeOutAndPause().then(() => {
            AudioManager.playAudio(shouldPlay);
        });
    }

    public static onBossDead(): void {
        AudioManager.fadeOutAndPause().then(() => {
            const rand = Math.random();
            if (rand < 0.5) AudioManager.playAudio(Audios.THE_TALE_OF_A_CRUEL_WORLD);
            else this.next();
        });
    }

    public static onDifficultRaise(difficulty: number) {
        if (this.addDifficulty || difficulty < 3) return;
        this.addDifficulty = true;

        AudioManager.fadeOutAndPause().then(() => {
            const index = this.randomInsertAudio(Audios.TROPIC_THUNDER);
            this.current = clamp(index, 0, this.playList.length - 1);
            AudioManager.playAudio(this.playList[this.current]);
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