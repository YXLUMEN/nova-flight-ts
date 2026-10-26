import type {StarLayer} from "../type/IStarLayer.ts";
import {deepFreeze} from "../utils/util.ts";

export const defaultLayers: Readonly<StarLayer[]> = deepFreeze([
    {
        count: 10,
        radiusMin: 1.4,
        radiusMax: 3.2,
        speedMin: 50,
        speedMax: 85,
        shakeFactor: 0.9,
        parallax: 0.8
    },
    {
        count: 40,
        radiusMin: 0.7,
        radiusMax: 2.2,
        speedMin: 20,
        speedMax: 40,
        shakeFactor: 0.3,
        parallax: 0.5
    },
    {
        count: 80,
        radiusMin: 1,
        radiusMax: 1.2,
        speedMin: 10,
        speedMax: 25,
        shakeFactor: 0,
        parallax: 0.08
    },
]);

export const lowPowerLayers: Readonly<StarLayer[]> = deepFreeze([
    {
        count: 20,
        radiusMin: 1.4,
        radiusMax: 3.2,
        speedMin: 50,
        speedMax: 85,
        shakeFactor: 0.9,
        parallax: 0.8
    },
    {
        count: 60,
        radiusMin: 1,
        radiusMax: 1,
        speedMin: 10,
        speedMax: 25,
        shakeFactor: 0,
        parallax: 0.08
    },
]);
