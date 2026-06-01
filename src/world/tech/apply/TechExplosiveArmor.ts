import type {ApplyTech} from "../ApplyTech.ts";
import type {ServerPlayerEntity} from "../../../server/entity/ServerPlayerEntity.ts";
import {EntityAttributes} from "../../../entity/attribute/EntityAttributes.ts";
import {AttributeModifier, Operation} from "../../../component/type/AttributeModifier.ts";
import {Identifier} from "../../../registry/Identifier.ts";

export class TechExplosiveArmor implements ApplyTech {
    private modifier = AttributeModifier.new(
        Identifier.ofVanilla('explosive_armor'),
        1.4,
        Operation.MULTIPLY
    );

    public apply(player: ServerPlayerEntity) {
        const instance = player.getAttributeInstance(EntityAttributes.PLAYER_EXPLODE_RANGE);
        instance?.addModifier(this.modifier);
    }

    public remove(player: ServerPlayerEntity) {
        const instance = player.getAttributeInstance(EntityAttributes.PLAYER_EXPLODE_RANGE);
        instance?.removeModifier(this.modifier);
    }
}
