import { concatHex, numberToHex } from "viem";

export const DUMMY_SIGNATURE = concatHex([
  numberToHex(0, { size: 6 }),
  numberToHex(0, { size: 6 }),
  "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c",
]);
