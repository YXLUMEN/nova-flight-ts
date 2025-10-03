import {Audios} from "./Audios.ts";
import {AudioManager} from "./AudioManager.ts";
import {sleep} from "../utils/uit.ts";

export class BGMManager {
    private static playList = [Audios.COME_ON_MABO, Audios.SOME_TIME_HJM, Audios.NO_MORE_MABO, Audios.SPACE_WALK, Audios.MABO_2_23, Audios.MABO_3_30, Audios.ELE_MABO];
    private static current = 0;

    public static init() {
        this.current = Math.floor(Math.random() * this.playList.length);
        AudioManager.playAudio(this.playList[this.current]);
        AudioManager.setVolume(0.5);

        AudioManager.addListener('bgm', 'ended', async () => {
            await sleep(3000);
            this.next();
        });
    }

    public static next() {
        this.current = (this.current + 1) % this.playList.length;
        AudioManager.playAudio(this.playList[this.current]);
    }
}