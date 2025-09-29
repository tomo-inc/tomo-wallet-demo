import { useConnect } from "wagmi";

export function WalletOptions() {
  const { connectors, connect } = useConnect();

  return connectors.map((connector) => (
    <button key={connector.uid} onClick={() => connect({ connector })} className="m-2 bg-[skyblue] p-1">
      {connector.name}
    </button>
  ));
}
