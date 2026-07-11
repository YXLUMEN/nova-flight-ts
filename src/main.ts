import {isServer} from "./configs/GlobalConfig.ts";
import {run} from "./lib.ts";


function main() {
    if (isServer) return;
    void run();
}

main();
