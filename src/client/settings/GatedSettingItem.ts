import {SettingItem} from "./SettingItem.ts";
import {WithoutHandler} from "../../type/errors.ts";
import {Result} from "../../utils/result/Result.ts";
import type {SettingGuard} from "./SettingGuard.ts";

export class GatedSettingItem<T> extends SettingItem<T> {
    private guard: SettingGuard<T> | null = null;

    /**
     * 受保护的设置项,调用时崩溃,考虑调用"request"或者目标系统提供的接口
     *
     * @see {request}
     * */
    public override set(): Result<never, Error> {
        return Result.err(new Error(
            `"${this.id}" gated setting, switch state via its target system, or try request`
        ));
    }

    public override reset(): Result<never, Error> {
        return Result.err(new Error(
            `"${this.id}" gated setting, switch state via its target system, or try request`
        ));
    }

    /** 生命周期已交给外部系统,不再受全局重载影响. 热更新请使用专用通道. */
    public override restore(value: T) {
        if (this.guard) return;
        super.restore(value);
    }

    /** 请求修改设置 */
    public async request(value: T): Promise<Result<T, Error>> {
        if (value === this.value) {
            return Result.ok(this.value);
        }

        if (!this.guard) {
            return Result.err(new WithoutHandler(`"${this.id}" hasn't set a handler`));
        }

        if (!this.validate(value)) {
            return Result.err(new Error(`Invalidate value "${value}"`));
        }

        return this.guard.accept(value, this.value);
    }

    /** 生命周期转交给目标 */
    public setGuard(guard: SettingGuard<T> | null): void {
        if (this.guard === guard) return;
        this.guard?.unbind();
        this.guard = guard;
    }

    /** 目标系统专用 */
    public force(value: T): Result<T, Error> {
        return super.set(value);
    }
}
