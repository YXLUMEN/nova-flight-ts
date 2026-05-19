import type {StarLayer} from "../type/IStarLayer.ts";
import {config, deepFreeze} from "../utils/uit.ts";

export const defaultLayers: Readonly<StarLayer[]> = deepFreeze([
    config({
        count: 10,
        alpha: 0.9,
        radiusMin: 1.4,
        radiusMax: 2.2,
        speedMin: 50,
        speedMax: 85,
        shakeFactor: 0.9,
        parallax: 0.8
    }),
    config({
        count: 40,
        alpha: 0.55,
        radiusMin: 0.7,
        radiusMax: 1.2,
        speedMin: 20,
        speedMax: 40,
        shakeFactor: 0.3,
        parallax: 0.5
    }),
    config({
        count: 80,
        alpha: 0.35,
        radiusMin: 0.5,
        radiusMax: 1,
        speedMin: 10,
        speedMax: 25,
        shakeFactor: 0,
        parallax: 0.08
    }),
]);

export const lowPowerLayers: Readonly<StarLayer[]> = deepFreeze([
    config({
        count: 20,
        alpha: 0.9,
        radiusMin: 1.4,
        radiusMax: 2.2,
        speedMin: 50,
        speedMax: 85,
        shakeFactor: 0.9,
        parallax: 0.8
    }),
    config({
        count: 60,
        alpha: 0.35,
        radiusMin: 0.5,
        radiusMax: 1,
        speedMin: 10,
        speedMax: 25,
        shakeFactor: 0,
        parallax: 0.08
    }),
]);
