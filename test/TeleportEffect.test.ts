/**
 * TeleportEffect 网络编解码测试。
 *
 * 视觉效果依赖 Canvas，这里只验证跨端同步的数据往返与边界收敛。
 */
import {assert, describe, it} from "vitest";
import {BinaryReader} from "../src/serialization/BinaryReader.ts";
import {BinaryWriter} from "../src/serialization/BinaryWriter.ts";
import {
    TeleportEffect,
    TeleportPhase,
    TELEPORT_LIFE,
    TELEPORT_RADIUS,
} from "../src/effect/TeleportEffect.ts";
import {Vec2} from "../src/utils/math/Vec2.ts";

interface TeleportSnapshot {
    readonly pos: Vec2;
    readonly color: string;
    readonly phase: TeleportPhase;
    readonly radius: number;
    readonly life: number;
}

function roundTrip(effect: TeleportEffect): TeleportSnapshot {
    const writer = BinaryWriter.alloc();
    TeleportEffect.PACKET_CODEC.encode(writer, effect);
    const reader = new BinaryReader(writer.toUint8Array());
    return TeleportEffect.PACKET_CODEC.decode(reader) as unknown as TeleportSnapshot;
}

describe("TeleportEffect 网络编解码", () => {
    it("往返后保留位置、颜色、阶段、半径与寿命", () => {
        const decoded = roundTrip(new TeleportEffect(
            new Vec2(12.5, -7.25),
            '#8a6dff',
            TeleportPhase.IN,
            96,
            0.6,
        ));

        assert.equal(decoded.pos.x, 12.5);
        assert.equal(decoded.pos.y, -7.25);
        assert.equal(decoded.color.toUpperCase(), '#8A6DFFFF');
        assert.equal(decoded.phase, TeleportPhase.IN);
        assert.equal(decoded.radius, 96);
        assert.ok(Math.abs(decoded.life - 0.6) < 1e-6);
    });

    it("非法半径与寿命收敛到可用范围", () => {
        const decoded = roundTrip(new TeleportEffect(Vec2.ZERO, '#fff', TeleportPhase.OUT, -5, 0));

        assert.equal(decoded.radius, 1);
        assert.ok(Math.abs(decoded.life - 0.01) < 1e-6);
        assert.equal(decoded.phase, TeleportPhase.OUT);
    });

    it("缺省参数与公开常量一致", () => {
        const decoded = roundTrip(new TeleportEffect(Vec2.ZERO));

        assert.equal(decoded.radius, TELEPORT_RADIUS);
        assert.ok(Math.abs(decoded.life - TELEPORT_LIFE) < 1e-6);
        assert.equal(decoded.phase, TeleportPhase.OUT);
    });
});
