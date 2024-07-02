import { ENTRYPOINT_ADDRESS_V07, bundlerActions } from "permissionless";
import { pimlicoBundlerActions } from "permissionless/actions/pimlico";
import { createClient, http } from "viem";
import { arbitrum } from "viem/chains";

export const bundlerClient = createClient({
  chain: arbitrum,
  transport: http(
    `https://api.pimlico.io/v2/${arbitrum.id}/rpc?apikey=${process.env.BUNDLER_API_KEY}`,
  ),
})
  .extend(bundlerActions(ENTRYPOINT_ADDRESS_V07))
  .extend(pimlicoBundlerActions(ENTRYPOINT_ADDRESS_V07));
