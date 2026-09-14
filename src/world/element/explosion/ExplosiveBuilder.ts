import type {SoundEvent} from "../../../sound/SoundEvent.ts";
import type {StatusEffectInstance} from "../../../entity/effect/StatusEffectInstance.ts";
import {ExplosionBehaviour, ExplosionConfigs, ExplosionTag} from "./ExplosionConfigs.ts";
import {SoundEvents} from "../../../sound/SoundEvents.ts";
import {FilterConfigs} from "./FilterConfigs.ts";

export class ExplosiveBuilder {
    private behaviour_: ExplosionBehaviour = ExplosionBehaviour.BOTH;
    private decay: boolean = true;
    private tag_: ExplosionTag = ExplosionTag.NONE;
    private sound_: SoundEvent = SoundEvents.EXPLOSION;
    private statusEffect?: StatusEffectInstance;

    public behaviour(v: ExplosionBehaviour) {
        this.behaviour_ = v;
        return this;
    }

    public noDecay() {
        this.decay = false;
        return this;
    }

    public tag(tag: ExplosionTag) {
        this.tag_ = tag;
        return this;
    }

    public sound(sound: SoundEvent) {
        this.sound_ = sound;
        return this;
    }

    public mute() {
        this.sound_ = SoundEvents.EMPTY;
        return this;
    }

    public effect(effect: StatusEffectInstance) {
        this.statusEffect = effect;
        return this;
    }

    public merge(builder: ExplosiveBuilder) {
        this.behaviour_ = builder.behaviour_;
        this.decay = builder.decay;
        this.tag_ = builder.tag_;
        this.sound_ = builder.sound_;
        this.statusEffect = builder.statusEffect;
        return this;
    }

    public build() {
        return new ExplosionConfigs(this.behaviour_, this.tag_, this.decay, this.sound_, this.statusEffect);
    }

    public filter() {
        return new FilterConfigs(this.behaviour_, this.tag_, this.decay, this.sound_, this.statusEffect);
    }

    public static from(configs: ExplosionConfigs) {
        const builder = new ExplosiveBuilder();
        builder.behaviour_ = configs.behaviour;
        builder.decay = configs.decay;
        builder.tag_ = configs.tag;
        builder.sound_ = configs.sound;
        builder.statusEffect = configs.statusEffect;
        return builder;
    }
}