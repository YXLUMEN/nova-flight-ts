import type {BinaryWriter} from "../serialization/BinaryWriter.ts";
import type {GameProfile} from "../server/entity/GameProfile.ts";
import {PacketHeader} from "./PacketHeader.ts";
import type {GCMEncrypt} from "./crypto/GCMEncrypt.ts";

export function buildExcludes(writer: BinaryWriter, excludes: GameProfile[]) {
    writer.writeInt8(PacketHeader.SERVER_EXCLUDE);
    writer.writeInt8(0);
    writer.writeVarUint(excludes.length);
    for (const session of excludes) {
        writer.writeInt8(session.sessionId);
    }
}

export async function buildEncrypt(
    encrypt: GCMEncrypt,
    writer: BinaryWriter,
    header: PacketHeader,
    sid: number,
) {
    const nonce = encrypt.nonce();
    const encrypted = await encrypt.encrypt(nonce, writer.toUint8Array());
    writer.reset();

    writer.writeInt8(header);
    writer.writeInt8(sid);
    writer.pushBytes(nonce);
    writer.pushBytes(encrypted);
    return writer.toUint8Array();
}