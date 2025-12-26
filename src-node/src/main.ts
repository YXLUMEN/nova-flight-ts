import {NodeServer} from "./NodeServer.ts";

function main() {
    console.log('Server starting');

    const server = NodeServer.startServer('MyWorld');
    server.runServer(0).then();
}

main();