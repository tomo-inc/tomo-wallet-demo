// Solana.tsx
import { ConnectionProvider, useConnection, useWallet, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl, Transaction } from "@solana/web3.js";
import { useMemo, useState } from "react";
import { Button, Col, Row } from "react-bootstrap";
import Input from "./input";

import "@solana/wallet-adapter-react-ui/styles.css";
import { useMutation } from "@tanstack/react-query";
import { Business, type Chain, type TransactionSOL } from "@tomo-inc/transaction-builder-sdk";
import { CONFIG } from "../config.test";

const Solana = () => {
  const network = "mainnet-beta";

  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], [network]);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <SolanaContent />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

const Account = () => {
  const { publicKey, disconnect } = useWallet();
  const address = publicKey?.toBase58() || "";

  return (
    <>
      currentAddress: {address}
      <Row style={{ marginBottom: "20px" }}>
        {address && (
          <div>
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
    </>
  );
};

const SolanaContent = () => {
  const { connected, publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const [amount, setAmount] = useState("10000");
  const [slippage, setSlippage] = useState(5);
  const [fromTokenAddress, setFromTokenAddress] = useState(""); // Native token (SOL)
  const [toTokenAddress, setToTokenAddress] = useState("So11111111111111111111111111111111111111112"); // Wrapped SOL
  const address = publicKey?.toBase58() || "";
  const business = new Business({
    config: {
      API_KEY: CONFIG.apiKey,
      API_SECRET: CONFIG.apiSecret,
      SALT: CONFIG.salt,
      CLIENT_ID: "",
    },
    tomoStage: CONFIG.tomoStage,
  });

  const chains = business.getSwapSupportChains();
  const currentChain = chains.find((item) => item.chainId === 501);

  const quoteParamsMock = {
    sender: address as string,
    recipient: address as string,
    fromToken: {
      address: fromTokenAddress || "", // Empty address represents native token (ETH)
      chain: currentChain as Chain,
    },
    toToken: {
      address: toTokenAddress || "", // USDC contract address
      chain: currentChain as Chain,
    },
    slippage: slippage,
    amount: amount,
  };

  /**
   * Fetch swap quotes using business.getSwapQuotes()
   *
   * This mutation will:
   * 1. Call the SDK's getSwapQuotes method
   * 2. Return an array of quotes from different DEXes
   * 3. Each quote contains routing info, amounts, fees, etc.
   *
   * Response structure:
   * [
   *   {
   *     "quoteID": "unique-id",
   *     "dexInfo": { "name": "Raydium", "logo": "..." },
   *     "amountIn": "1000000000",
   *     "amountOut": "950000000",
   *     "gasNetWorkFee": "0.00005",
   *     "routes": [...]
   *   }
   * ]
   */
  const {
    mutate: quote,
    data: quotes,
    isPending: isQuotePending,
  } = useMutation({
    mutationKey: ["business.getSwapQuotes", JSON.stringify({ quoteParamsMock })],
    mutationFn: async () => {
      const quotes = await business.getSwapQuotes(quoteParamsMock);
      return quotes;
    },
  });

  const haveRouter = quotes && quotes?.length >= 1;

  /**
   * Build unsigned transaction using business.swapBuilder()
   *
   * This mutation will:
   * 1. Take the first (best) quote from quotes array
   * 2. Call the SDK's swapBuilder method
   * 3. Return an unsigned transaction ready for signing
   *
   * Note: This is only enabled when quotes are available
   *
   * Transaction structure:
   * {
   *   "data": "0x...", // Serialized transaction data in hex format
   * }
   */
  const {
    mutate: builder,
    data: transaction,
    isPending: isBuilderPending,
  } = useMutation({
    mutationKey: ["business.swapBuilder", JSON.stringify({ quoteParamsMock })],
    mutationFn: async () => {
      // Ensure we have quotes before building transaction
      if (!quotes) return null;

      // Use the first (best) quote to build transaction
      const transaction = await business.swapBuilder(quotes[0], quoteParamsMock);
      return transaction;
    },
  });

  /**
   * Send transaction using wallet adapter's sendTransaction
   *
   * This mutation handles the actual transaction sending:
   * 1. Takes the built transaction from swapBuilder
   * 2. Deserializes the hex transaction data
   * 3. Signs and sends it via wallet adapter's sendTransaction
   * 4. Returns the transaction signature
   */
  const {
    mutate: send,
    data: hash,
    isPending: isSendPending,
  } = useMutation({
    mutationKey: ["solana.send", JSON.stringify({ transaction })],
    mutationFn: async () => {
      try {
        if (!transaction) return null;
        const rawTransaction = (transaction as TransactionSOL).data;
        const transactionBuffer = Buffer.from(rawTransaction, "hex");
        const tx = Transaction.from(transactionBuffer);
        const hash = await sendTransaction(tx, connection);
        return hash;
      } catch (error) {
        console.error(error);
        return "";
      }
    },
  });

  return (
    <div>
      {connected ? (
        <>
          <Account />
          <Input
            label="From Token"
            controlId="fromTokenAddress"
            type="text"
            placeholder="From Token Address"
            value={fromTokenAddress}
            onChange={(e) => setFromTokenAddress(e.target.value)}
          />

          <Input
            label="To Token"
            controlId="toTokenAddress"
            type="text"
            placeholder="To Token Address"
            value={toTokenAddress}
            onChange={(e) => setToTokenAddress(e.target.value)}
          />

          <Input
            label="Amount"
            controlId="amount"
            type="text"
            placeholder="Amount (lamports)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          <Input
            label="Slippage"
            controlId="slippage"
            type="number"
            placeholder="Slippage (%)"
            value={slippage.toString()}
            onChange={(e) => setSlippage(Number(e.target.value))}
          />

          <Row style={{ marginBottom: "20px" }}>
            <Col md={6}>
              <Button
                disabled={isQuotePending}
                onClick={() => {
                  quote();
                }}
              >
                {isQuotePending ? "pending" : "quote"}
              </Button>
            </Col>
          </Row>

          {haveRouter && (
            <div
              style={{
                width: "100%",
                maxHeight: "400px",
                overflow: "auto",
                border: "1px solid #ccc",
                borderRadius: "4px",
                padding: "10px",
                backgroundColor: "#f8f9fa",
                color: "#000000",
                marginBottom: "20px",
              }}
            >
              <pre>{JSON.stringify(quotes, null, 2)}</pre>
            </div>
          )}

          {haveRouter && (
            <>
              <Row style={{ marginBottom: "20px" }}>
                <Col md={6}>
                  <Button
                    disabled={isBuilderPending}
                    onClick={() => {
                      builder();
                    }}
                  >
                    {isBuilderPending ? "pending" : "builder"}
                  </Button>
                </Col>
              </Row>

              {transaction && (
                <div
                  style={{
                    width: "100%",
                    maxHeight: "400px",
                    overflow: "auto",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    padding: "10px",
                    backgroundColor: "#f8f9fa",
                    color: "#000000",
                  }}
                >
                  <pre>{JSON.stringify(transaction, null, 2)}</pre>
                </div>
              )}

              <Row style={{ marginBottom: "20px" }}>
                <Col md={6}>
                  <Button
                    disabled={!transaction || isSendPending}
                    onClick={() => {
                      send();
                    }}
                  >
                    Send
                  </Button>
                </Col>
              </Row>

              {hash && (
                <>
                  <div>Transaction Hash: {hash}</div>
                  <a
                    href={`https://explorer.solana.com/tx/${hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#007bff", textDecoration: "underline" }}
                  >
                    View on Explorer
                  </a>
                </>
              )}
            </>
          )}
        </>
      ) : (
        <>
          <div style={{ display: "flex", marginTop: "20px" }}>
            <WalletMultiButton />
          </div>
        </>
      )}
    </div>
  );
};

export default Solana;
