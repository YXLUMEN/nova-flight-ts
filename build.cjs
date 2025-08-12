const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, './dist');

function main() {
    const url = path.join(root, 'index.html');

    let htmlStr = fs.readFileSync(url, {encoding: 'utf-8'});

    const regex = /<script.*>/g;
    htmlStr = htmlStr.replace(regex, str => {
        return str.replace(/\snomodule|\scrossorigin|\stype="module"/g, '');
    });

    fs.writeFileSync(url, htmlStr);
}

main();