import {Audios} from "./Audios.ts";
import {AudioManager} from "./AudioManager.ts";
import {sleep} from "../utils/uit.ts";

export class BGMManager {
    private static playList = [Audios.COME_ON_MABO, Audios.SOME_TIME_HJM, Audios.SOME_TIME_HJM, Audios.SPACE_WALK];
    private static current = 0;

    public static init() {
        this.current = Math.floor(Math.random() * this.playList.length);
        AudioManager.playAudio(this.playList[this.current]);
        AudioManager.setVolume(0.5);

        AudioManager.setAudio().loop = false;
        AudioManager.addListener('bgm', 'ended', async () => {
            this.current = (this.current + 1) % this.playList.length;
            await sleep(1000);
            AudioManager.playAudio(this.playList[this.current]);
        });
    }
}