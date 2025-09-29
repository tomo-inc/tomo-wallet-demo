import { useEffect, useState } from "react";

import OidcAuthDemo from "./1-oidc-auth";
import CubeConnectDemo from "./2-cube-connect";
import WalletApiDemo from "./3-wallet-api";
import AccountApiDemo from "./4-account-api";

import { LoginType, CubeConnectResult } from "@tomo-inc/social-account-sdk";

export default function SocialWalletDemo() {
  const [oidcToken, setOidcToken] = useState("");
  const [accountData, setAccountData] = useState(null);

  useEffect(() => {
    const oidcToken = localStorage.getItem("oidcToken") || "";
    if (oidcToken) {
      setOidcToken(oidcToken);
    }
  }, []);

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold mt-2">Test on dogeOS devent</h1>
        <div>
          faucet:{" "}
          <a className="text-[#3697FF]" href="https://faucet.devnet.doge.xyz/" target="_blank" rel="noreferrer">
            https://faucet.devnet.doge.xyz/
          </a>
        </div>
      </div>
      <OidcAuthDemo
        onLogin={async ({ oidcToken, loginType }: { oidcToken: string; loginType: LoginType }) => {
          console.log("step1: social login", { oidcToken, loginType });
          localStorage.setItem("oidcToken", oidcToken);
          setOidcToken(oidcToken);
        }}
      />

      {oidcToken && (
        <CubeConnectDemo
          oidcToken={oidcToken}
          onConnected={async (accountData: CubeConnectResult) => {
            setAccountData(accountData);
            console.log("step2: cube connect:", accountData);
          }}
        />
      )}

      {accountData && <AccountApiDemo accountData={accountData} />}

      {accountData && <WalletApiDemo walletId={accountData?.accountWallet?.walletID} />}
    </div>
  );
}
