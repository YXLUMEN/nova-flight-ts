import {EntityRenderers} from "./entity/EntityRenderers.ts";
import {TipManager} from "../tips/TipManager.ts";
import {ModelManager} from "./model/ModelManager.ts";
import type {LoadingScreen} from "./ui/LoadingScreen.ts";
import {sleep} from "../../utils/uit.ts";

export class RenderLoader {
    public static async registerAndLoad(loadScreen: LoadingScreen) {
        loadScreen.setSubProgress(0, 'load tips');
        TipManager.init();
        await sleep(20);

        loadScreen.setSubProgress(0.3, 'generating models');
        ModelManager.generateAll();
        await sleep(50);

        loadScreen.setSubProgress(1, 'registering entity renders');
        EntityRenderers.registryRenders();
        await sleep(50);
        loadScreen.hideSubBar();
    }
}