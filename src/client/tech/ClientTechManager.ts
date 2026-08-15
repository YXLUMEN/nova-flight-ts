import type {RegistryEntry} from "../../registry/tag/RegistryEntry.ts";
import type {Tech} from "../../world/tech/Tech.ts";
import type {Constructor} from "../../type/types.ts";
import {Techs} from "../../world/tech/Techs.ts";
import type {ClientApplyTech} from "./ClientApplyTech.ts";
import type {ClientPlayerEntity} from "../entity/ClientPlayerEntity.ts";
import {TechSteeringGear} from "./apply/TechSteeringGear.ts";
import {TechFireCC} from "./apply/TechFireCC.ts";
import {TechBC} from "./apply/TechBC.ts";
import {TechFollow} from "./apply/TechFollow.ts";

export class ClientTechManager {
    private static readonly techMap: Map<RegistryEntry<Tech>, ClientApplyTech> = new Map();

    public static apply(tech: RegistryEntry<Tech>, player: ClientPlayerEntity): void {
        this.techMap.get(tech)?.apply(player);
    }

    public static remove(tech: RegistryEntry<Tech>, player: ClientPlayerEntity): void {
        this.techMap.get(tech)?.remove(player);
    }

    private static register(tech: RegistryEntry<Tech>, apply: Constructor<ClientApplyTech>): void {
        if (this.techMap.has(tech)) throw new Error(`TechApply ${tech} already registered.`);
        this.techMap.set(tech, new apply());
    }

    public static init() {
        this.register(Techs.STEERING_GEAR, TechSteeringGear);
        this.register(Techs.FIRE_CONTROL_COMPUTER, TechFireCC);
        this.register(Techs.BALLISTIC_CALCULATOR, TechBC);
        this.register(Techs.INSTANT_RESPONSE, TechFollow);
    }
}