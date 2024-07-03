import { arbitrum } from "viem/chains";
import { createPublicClient, http } from "viem";
import { configDotenv } from "dotenv";

configDotenv();

export const publicClient = createPublicClient({
  chain: arbitrum,
  transport: http("https://rpc.ankr.com/arbitrum/" + process.env.ANKR_API_KEY),
});
