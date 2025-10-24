import type {StringReader} from "./StringReader.ts";

export interface ArgumentType<T> {
    parse(reader: StringReader): T;

    // listSuggestions<S>(context: CommandContext<S>, builder: any)
}