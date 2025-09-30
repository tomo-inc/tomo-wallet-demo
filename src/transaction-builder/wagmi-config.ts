import { createConfig, http } from "wagmi";
import { bsc, mainnet } from "wagmi/chains";

export const config = createConfig({
  chains: [bsc, mainnet],
  transports: {
    [bsc.id]: http(),
    [mainnet.id]: http(),
  },
});
