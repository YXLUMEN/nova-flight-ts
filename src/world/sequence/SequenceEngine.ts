import {SequenceContext} from "./SequenceContext.ts";
import type {NovaFlightServer} from "../../server/NovaFlightServer.ts";
import {CancelToken} from "./CancelToken.ts";
import type {SequenceDef} from "./SequenceBuilder.ts";

export class SequenceEngine {
    private readonly server: NovaFlightServer;
    private currentToken: CancelToken | null = null;
    private currentCtx: SequenceContext | null = null;

    public constructor(server: NovaFlightServer) {
        this.server = server;
    }

    public async play(sequence: SequenceDef): Promise<void> {
        this.skip();

        const token = new CancelToken();
        this.currentToken = token;

        const ctx = new SequenceContext(this.server, this.currentToken);
        this.currentCtx = ctx;

        try {
            for (const step of sequence.steps) {
                if (token.isCancelled()) break;
                await step.execute(ctx);
            }
        } finally {
            if (this.currentToken === token) {
                if (!sequence.keepCtx) {
                    ctx.clear();
                    this.currentCtx = null;
                }
                this.currentToken = null;
            }
        }
    }

    public skip(): void {
        this.currentCtx?.clear();
        this.currentCtx = null;
        this.currentToken = null;
    }
}