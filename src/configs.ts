import type {StarLayer} from "./apis/IStarLayer.ts";
import {createCleanObj} from "./math/uit.ts";

const layers: StarLayer[] = [
    createCleanObj({
        count: 10,
        alpha: 0.9,
        radiusMin: 1.4,
        radiusMax: 2.2,
        speedMin: 50,
        speedMax: 85,
        shakeFactor: 0.9,
        parallax: 0.8
    }),
    createCleanObj({
        count: 20,
        alpha: 0.75,
        radiusMin: 1.0,
        radiusMax: 1.6,
        speedMin: 35,
        speedMax: 60,
        shakeFactor: 0.5,
        parallax: 0.7
    }),
    createCleanObj({
        count: 40,
        alpha: 0.55,
        radiusMin: 0.7,
        radiusMax: 1.2,
        speedMin: 20,
        speedMax: 40,
        shakeFactor: 0.3,
        parallax: 0.5
    }),
    createCleanObj({
        count: 80,
        alpha: 0.35,
        radiusMin: 0.5,
        radiusMax: 1,
        speedMin: 10,
        speedMax: 25,
        shakeFactor: 0,
        parallax: 0.08
    }),
];

export {
    layers,
}