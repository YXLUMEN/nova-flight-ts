import {argbIntToHex, hexToArgbInt} from "../src/utils/NetUtil";

const hex = '#FFADADCC';

const int = hexToArgbInt(hex);
console.log(int);

const iHex = argbIntToHex(int);
console.log(iHex);
console.log(hex);