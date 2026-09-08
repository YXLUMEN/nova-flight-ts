import {isServer} from "./configs/RuntimeConfig.ts";
import {run} from "./lib.ts";


function main() {
    if (isServer) return;
    void run();
}

main();
