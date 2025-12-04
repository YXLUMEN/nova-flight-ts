import {decodeColorHex, encodeColorHex} from "../src/utils/NetUtil";

const hex = '#FFADADCC';

const int = encodeColorHex(hex);
console.log(int);

const iHex = decodeColorHex(int);
console.log(iHex);
console.log(hex);