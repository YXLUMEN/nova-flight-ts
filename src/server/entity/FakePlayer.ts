import {ServerPlayerEntity} from "./ServerPlayerEntity.ts";
import {DataComponents} from "../../component/DataComponents.ts";
import {PlayerReloadC2SPacket} from "../../network/packet/c2s/PlayerReloadC2SPacket.ts";

export class FakePlayer extends ServerPlayerEntity {
    protected override onDiscard() {
        super.onDiscard();
        this.networkHandler.forceDisconnect();
    }

    public override handleFire() {
        super.handleFire();

        const stack = this.getInventory().getSelectedItem();
        if (stack.getDamage() === 0 || stack.getOr(DataComponents.RELOADING, false)) {
            return;
        }
        this.networkHandler.accept(PlayerReloadC2SPacket.INSTANCE);
    }
}
