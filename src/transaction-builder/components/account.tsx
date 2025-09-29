import { Button, Row } from "react-bootstrap";
import { useAccount, useChainId, useChains, useDisconnect, useEnsAvatar, useEnsName } from "wagmi";

export function Account() {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: ensName } = useEnsName({ address });
  const { data: ensAvatar } = useEnsAvatar({ name: ensName! });
  const chainId = useChainId();
  const chains = useChains();
  const chain = chains.find((rc) => rc.id === chainId);
  return (
    <div>
      {ensAvatar && <img alt="ENS Avatar" src={ensAvatar} />}
      <Row style={{ marginBottom: "20px" }}>currentChain: {chain?.name}</Row>
      <Row style={{ marginBottom: "20px" }}>chainId: {chainId}</Row>
      <Row style={{ marginBottom: "20px" }}>
        {address && (
          <div>
            {ensName ? `${ensName} (${address})` : address}{" "}
            <Button
              onClick={() => {
                disconnect();
              }}
            >
              Disconnect
            </Button>
          </div>
        )}
      </Row>
    </div>
  );
}
