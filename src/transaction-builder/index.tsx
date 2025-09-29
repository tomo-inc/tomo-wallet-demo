import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "bootstrap/dist/css/bootstrap.min.css";
import { WagmiProvider } from "wagmi";
import TransactionBuilder from "./transaction-builder.tsx";
import { config } from "./config.ts";
import "./index.css";

export default function Provider() {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <TransactionBuilder />
      </WagmiProvider>
    </QueryClientProvider>
  );
}
