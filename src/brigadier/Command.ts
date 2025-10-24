import type {CommandContext} from "./context/CommandContext.ts";

export type Command<S> = (context: CommandContext<S>) => void;