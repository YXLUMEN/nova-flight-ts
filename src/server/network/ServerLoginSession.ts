import {ServerCommonHandler} from "./ServerCommonHandler.ts";
import type {GameProfile} from "../entity/GameProfile.ts";
import type {ConnectionStateType} from "./ConnectionState.ts";

export class ServerLoginSession extends ServerCommonHandler {
    public getPhase(): ConnectionStateType {
        throw new Error("Method not implemented.");
    }

    protected getProfile(): GameProfile {
        throw new Error("Method not implemented.");
    }
}