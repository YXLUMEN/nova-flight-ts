import type {Payload} from "../../../network/Payload.ts";

export interface Egress {
    /** 将广播数据包入队 */
    enqueue(payload: Payload): void;

    /** 立刻安排广播 */
    broadcast(payload: Payload): void;

    /** 立刻安排发送数据帧 */
    sendFrame(frame: Uint8Array<ArrayBuffer>): void;

    /** 立刻安排发送控制帧. 连接关闭时无效 */
    action(frame: Uint8Array<ArrayBuffer>): void;
}