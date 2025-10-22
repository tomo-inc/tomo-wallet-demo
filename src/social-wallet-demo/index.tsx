import { useEffect, useState } from "react";

import OidcAuthDemo from "./1-oidc-auth";
import CubeConnectDemo from "./2-cube-connect";
import WalletApiDemo from "./3-wallet-api";
import AccountApiDemo from "./4-account-api";

import { Link } from "@heroui/react";
import { CubeConnectResult, LoginType } from "@tomo-inc/social-account-sdk";

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
    <div className="p-2">
      <div>
        <div>
          <h1 className="text-primary text-2xl font-bold">Social Wallet SDK Demo</h1>
          <p className="text-muted">Demo for Social Wallet SDK</p>
        </div>
        DogeOS devnet Faucet: <Link href="https://faucet.devnet.doge.xyz/" target="_blank" rel="noreferrer">https://faucet.devnet.doge.xyz/</Link>
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
