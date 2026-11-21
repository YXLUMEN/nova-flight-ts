import {assert, it} from "vitest";
import {GCM_NONCE_BYTES} from "../src/network/crypto/GCMHelper.ts";
import {NonceGenerator} from "../src/network/crypto/NonceGenerator.ts";
import {NonceExhaustedError} from "../src/type/errors.ts";

interface NonceProb {
    hi: number;
    lo: number;
}

it('生成 12 字节 nonce', () => {
    const generator = new NonceGenerator(0x0102_0304);
    assert.equal(
        generator.next().toHex(),
        '040302010000000000000000',
    );
    assert.equal(
        generator.next().toHex(),
        '040302010000000001000000',
    );
    assert.equal(generator.used(), 2n);
    assert.equal(generator.isExhausted(), false);
});

it('同一实例连续生成的 nonce 不重复', () => {
    const generator = new NonceGenerator(0x1234_5678);
    const seen = new Set();
    for (let index = 0; index < 10_000; index += 1) {
        const nonce = generator.next();
        assert.equal(nonce.byteLength, GCM_NONCE_BYTES);
        const value = nonce.toHex();
        assert.equal(seen.has(value), false, `重复 nonce: ${value}`);
        seen.add(value);
    }
    assert.equal(generator.used(), 10_000n);
});

it('相同 fixed 与初始状态产生相同的序列', () => {
    const first = new NonceGenerator(1);
    const second = new NonceGenerator(1);
    for (let index = 0; index < 3; index += 1) {
        assert.deepEqual(first.next(), second.next());
    }
});

it('不同 fixed 产生不同的 nonce', () => {
    const first = new NonceGenerator(1);
    const second = new NonceGenerator(2);
    assert.notDeepEqual(first.next(), second.next());
});

it('返回的数组是副本', () => {
    const generator = new NonceGenerator(7);
    const first = generator.next();
    first.fill(0xff);
    assert.equal(
        generator.next().toHex(),
        '070000000000000001000000',
    );
});

it('达到 2^64 次后不回绕到 0', () => {
    const generator = new NonceGenerator(1);
    const prob = generator as unknown as NonceProb;
    prob.hi = 0xffffffff;
    prob.lo = 0xfffffffd;

    assert.equal(generator.next().toHex(), '01000000fffffffffdffffff');
    assert.equal(generator.next().toHex(), '01000000fffffffffeffffff');
    assert.equal(generator.next().toHex(), '01000000ffffffffffffffff');
    assert.equal(generator.isExhausted(), true);
    assert.throws(() => generator.next(), NonceExhaustedError);
    assert.throws(() => generator.next(), NonceExhaustedError);
});

it('参数校验拒绝越界和错误类型', () => {
    assert.throws(
        () => new NonceGenerator(1.5),
        TypeError,
    );
    assert.throws(
        () => new NonceGenerator(-1),
        RangeError,
    );
    assert.throws(
        () => new NonceGenerator(0x1_0000_0000),
        RangeError,
    );
});