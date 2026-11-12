import type {Result} from "../../utils/result/Result.ts";

export interface SettingGuard<T> {
    accept(value: T, prev: T): Promise<Result<T, Error>>;

    unbind(): void;
}