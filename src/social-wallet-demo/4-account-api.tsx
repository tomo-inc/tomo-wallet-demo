import { useEffect, useState } from "react";
import { formatUnits, fromHex, hexToBigInt, numberToHex, parseUnits, serializeTransaction, toHex } from "viem";

import { CubeConnectResult, SocialAccount, TomoAppConfig } from "@tomo-inc/social-account-sdk";
import { CONFIG } from "./config.test";

export default function AccountApiDemo({ accountData }: { accountData: CubeConnectResult }) {
  const [address, setAddress] = useState("");
  const [evmAccount, setEvmAccount] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [signedTx, setSignedTx] = useState(null);

  useEffect(() => {
    const chainConfig: any = { chainType: "evm", chainId: "8453" };
    const tomoAppConfig: TomoAppConfig = {
      tomoStage: CONFIG.tomoStage as "dev" | "prod",
      tomoClientId: CONFIG.tomoClientId,
      apiKey: CONFIG.apiKey,
      apiSecret: CONFIG.apiSecret,
      salt: CONFIG.salt,
    };
    const evmAccount = SocialAccount(accountData, chainConfig, tomoAppConfig);
    console.log("step3: evmAccount ready", evmAccount, accountData);

    setEvmAccount(evmAccount);
    setIsLoading(false);
  }, [accountData]);

  if (isLoading) {
    return "wallt initializing...";
  }

  return (
    <>
      <h1 className="text-2xl font-bold mt-4">Wallet API:</h1>
      <div className="bg-gray-100 p-2">
        <div>address: {address}</div>
        <button
          className="m-2 bg-[#999] p-1"
          onClick={async () => {
            const data = await evmAccount.eth_accounts();
            console.log("eth_accounts", data);
            setAddress(data?.[0]);
          }}
        >
          eth_accounts
        </button>

        <button
          className="m-2 bg-[#999] p-1"
          onClick={async () => {
            const chainId = await evmAccount.eth_chainId();
            console.log("getChainId", chainId);
          }}
        >
          eth_chainId
        </button>

        <button
          className="m-2 bg-[#999] p-1"
          onClick={async () => {
            //chainId = 221122420/toHex(221122420);
            const res = await evmAccount.wallet_switchEthereumChain([{ chainId: "221122420" }]);
            console.log("wallet_switchEthereumChain", res);
          }}
        >
          wallet_switchEthereumChain
        </button>

        <button
          className="m-2 bg-[#999] p-1"
          onClick={async () => {
            const message = toHex("Hello, world!");
            const signature = await evmAccount.personal_sign([message, address]);
            console.log("personal_sign", signature);
          }}
        >
          personal_sign
        </button>

        <button
          className="m-2 bg-[#999] p-1"
          onClick={async () => {
            const chainIdHex = await evmAccount.eth_chainId();
            const chainId = fromHex(chainIdHex, "number");

            const types = {
              EIP712Domain: [
                { name: "name", type: "string" },
                { name: "version", type: "string" },
                { name: "chainId", type: "uint256" },
                { name: "verifyingContract", type: "address" },
              ],
              Person: [
                { name: "name", type: "string" },
                { name: "wallet", type: "address" },
              ],
              Mail: [
                { name: "from", type: "Person" },
                { name: "to", type: "Person" },
                { name: "contents", type: "string" },
              ],
            };

            const domain = {
              name: "Ether Mail",
              version: "1",
              chainId: chainId,
              verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC",
            };

            //mail
            const message = {
              from: {
                name: "Cow",
                wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
              },
              to: {
                name: "Bob",
                wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
              },
              contents:
                "Hello, Bob! I think that it's extraordinarily important that we in computer science keep fun in computing. When it started out, it was an awful lot of fun. Of course, the paying customers got shafted every now and then, and after a while we began to take their complaints seriously. We began to feel as if we really were responsible for the successful, error-free perfect use of these machines. I don't think we are. I think we're responsible for stretching them, setting them off in new directions, and keeping fun in the house. I hope the field of computer science never loses its sense of fun.",
            };

            const params = [
              address,
              {
                types,
                primaryType: "Mail",
                domain,
                message,
              },
            ];
            const signature = await evmAccount.eth_signTypedData_v4(params);
            console.log("eth_signTypedData_v4", signature);
          }}
        >
          eth_signTypedData_v4
        </button>

        <button
          className="m-2 bg-[#999] p-1"
          onClick={async () => {
            const nonce = await evmAccount.eth_getTransactionCount([address, "latest"]);
            console.log("getNonce", nonce);
          }}
        >
          getNonce(eth_getTransactionCount)
        </button>

        <button
          className="m-2 bg-[#999] p-1"
          onClick={async () => {
            const data = await evmAccount.eth_getBalance([address, "latest"]);
            console.log("getBalance", data);
          }}
        >
          eth_getBalance
        </button>

        <button
          className="m-2 bg-[#999] p-1"
          onClick={async () => {
            const tx = {
              to: address,
              from: address,
              value: numberToHex(parseUnits("0.000001", 18)),
              chainId: toHex(221122420),
            };
            const gasFeeHex = await evmAccount.eth_estimateGas([tx]);
            const gasFee = formatUnits(hexToBigInt(gasFeeHex), 18);
            console.log("eth_estimateGas", gasFeeHex, gasFee);
          }}
        >
          eth_estimateGas
        </button>

        <button
          disabled={!address}
          className="m-2 bg-[#999] p-1"
          onClick={async () => {
            const nonce = await evmAccount.eth_getTransactionCount([address, "latest"]);
            const txData: any = {
              to: address,
              value: numberToHex(parseUnits("1", 18)),
              chainId: toHex(221122420),
              nonce: toHex(nonce),
              gasLimit: `0x52080`,
              maxFeePerGas: `0x3b9aca100`,
              maxPriorityFeePerGas: `0x3b9aca100`,
            };
            console.log("txData", txData);
            const signature = await evmAccount.eth_signTransaction([txData]);
            const signedTx: `0x${string}` = serializeTransaction(signature);
            setSignedTx(signedTx);
            console.log("eth_signTransaction", signature, signedTx);
          }}
        >
          eth_signTransaction
        </button>

        <button
          disabled={!signedTx}
          className="m-2 bg-[#999] p-1"
          onClick={async () => {
            if (!signedTx) {
              console.error("signedTx is not set");
              return;
            }
            const txId = await evmAccount.eth_sendRawTransaction([signedTx]);
            console.log("sendTransaction", `https://blockscout.devnet.doge.xyz/tx/${txId}`);
            setSignedTx(null);
          }}
        >
          sendTransaction
        </button>

        <button
          disabled={!signedTx}
          className="m-2 bg-[#999] p-1"
          onClick={async () => {
            if (!signedTx) {
              console.error("signedTx is not set");
              return;
            }
            const rpcUrl = "https://rpc.devnet.doge.xyz";
            const txId = await evmAccount.eth_sendRawTransaction([signedTx], rpcUrl);
            console.log("sendTransaction by rpcUrl", `https://blockscout.devnet.doge.xyz/tx/${txId}`);
            setSignedTx(null);
          }}
        >
          sendTransaction with rpcUrl
        </button>

        <button
          className="m-2 bg-[#999] p-1"
          onClick={async () => {
            const hash = "0x2a3ba0e13b5e812586ca2e9535d7b217da838b59e6419dc3bce885294dbe7a4f";
            evmAccount.wallet_switchEthereumChain([{ chainId: "221122420" }]);
            const res = await evmAccount.getTransaction(hash);
            console.log("getTransaction", res);
          }}
        >
          getTransaction
        </button>
      </div>
    </>
  );
}
