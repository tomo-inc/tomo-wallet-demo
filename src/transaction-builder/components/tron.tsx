// Tron.tsx
import { useMutation, useQuery } from "@tanstack/react-query";
import { Business, type Chain, type TransactionTRON } from "@tomo-inc/transaction-builder-sdk";
import { TronLinkAdapter } from "@tronweb3/tronwallet-adapters";
import { useEffect, useState } from "react";
import { Button, Col, Row } from "react-bootstrap";
import { TronWeb } from "tronweb";
import Input from "./input";

import { CONFIG } from "../config.test";

const TronWalletContent = () => {
  const [address, setAddress] = useState<string>("");
  const [tronLinkAdapter, setTronLinkAdapter] = useState<TronLinkAdapter | null>(null);
  const [amount, setAmount] = useState("10000"); // 1 TRX in SUN
  const [slippage, setSlippage] = useState(5);
  const [fromTokenAddress, setFromTokenAddress] = useState(""); // Native token (TRX)
  const [toTokenAddress, setToTokenAddress] = useState(
    "TNUC9Qb1rRpS5CbWLmNMxXBjyFoydXjWFR", // USDT on Tron
  );
  const [approveHash, setApproveHash] = useState("");

  const business = new Business({
    config: {
      API_KEY: CONFIG.apiKey,
      API_SECRET: CONFIG.apiSecret,
      SALT: CONFIG.salt,
      CLIENT_ID: "",
    },
    tomoStage: CONFIG.tomoStage,
  });

  const tronWeb = new TronWeb({
    // fullHost: business.tron.rpc,
    fullHost: "https://api.trongrid.io",
  });

  useEffect(() => {
    const initTronLink = async () => {
      try {
        const adapter = new TronLinkAdapter();
        setTronLinkAdapter(adapter);

        if (adapter.connected) {
          setAddress(adapter.address || "");
        }
      } catch (error) {
        console.error("Failed to initialize TronLink adapter:", error);
      }
    };

    initTronLink();

    return () => {
      if (tronLinkAdapter) {
        tronLinkAdapter.removeAllListeners();
      }
    };
  }, []);

  useEffect(() => {
    if (!tronLinkAdapter) return;

    const handleConnect = () => {
      setAddress(tronLinkAdapter.address || "");
    };

    const handleDisconnect = () => {
      setAddress("");
    };

    tronLinkAdapter.on("connect", handleConnect);
    tronLinkAdapter.on("disconnect", handleDisconnect);

    return () => {
      tronLinkAdapter.off("connect", handleConnect);
      tronLinkAdapter.off("disconnect", handleDisconnect);
    };
  }, [tronLinkAdapter]);

  const connectWallet = async () => {
    if (!tronLinkAdapter) {
      console.error("TronLink adapter not initialized");
      return;
    }

    try {
      await tronLinkAdapter.connect();
    } catch (error) {
      console.error("Failed to connect to TronLink:", error);
    }
  };

  const disconnectWallet = async () => {
    if (!tronLinkAdapter) return;

    try {
      await tronLinkAdapter.disconnect();
      setAddress("");
    } catch (error) {
      console.error("Failed to disconnect:", error);
    }
  };

  const chains = business.getSwapSupportChains();
  const currentChain = chains.find((item) => item.chainId === 195); // Tron mainnet chain ID

  /**
   * Parameters for swap quote request
   *
   * Required parameters:
   * - sender: User's wallet address
   * - recipient: Receiver's wallet address (can be same as sender)
   * - fromToken: Source token information
   * - toToken: Destination token information
   * - slippage: Maximum acceptable slippage percentage
   * - amount: Amount to swap (in token's smallest unit)
   */
  const quoteParamsMock = {
    sender: address,
    recipient: address,
    fromToken: {
      address: fromTokenAddress || "", // Empty address represents native token (TRX)
      chain: currentChain as Chain,
    },
    toToken: {
      address: toTokenAddress || "", // USDT contract address
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
   *     "dexInfo": { "name": "SunSwap", "logo": "..." },
   *     "amountIn": "1000000",
   *     "amountOut": "950000",
   *     "gasNetWorkFee": "0.01",
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

  /**
   * Generate TRC20 token approval transaction
   *
   * When swapping from a TRC20 token, an approval transaction may be required
   * to allow the DEX contract to spend the user's tokens.
   *
   * Query key dependencies:
   * - quoteParamsMock: Quote parameters object
   * - quotes: Available quotes list
   * - approveHash: Approval transaction hash (used to trigger query refresh after approval)
   */
  const { data: approveTransaction, isFetched: approveTxFetched } = useQuery({
    queryKey: ["business.getApproveBuilder", JSON.stringify({ quoteParamsMock, quotes, approveHash })],
    staleTime: 0,
    queryFn: async () => {
      if (!quotes) return null;
      try {
        const transaction = await business.getApproveBuilder(quotes[0], quoteParamsMock);
        return transaction ? (transaction as TransactionTRON) : null;
      } catch {
        return null;
      }
    },
  });

  /**
   * Send TRC20 token approval transaction
   *
   * This mutation handles sending the approval transaction via TronWeb:
   * 1. Takes the approval transaction from getApproveBuilder
   * 2. Signs and sends it using TronLink adapter
   * 3. Updates the approveHash state for query invalidation
   */
  const { mutate: approve, isPending: isApprovePending } = useMutation({
    mutationKey: ["tron.send", JSON.stringify({ approveTransaction })],
    mutationFn: async () => {
      if (!approveTransaction || !tronWeb || !tronLinkAdapter) return null;
      try {
        // Convert hex string to byte array
        const rawTransaction = (approveTransaction as TransactionTRON).rawData;
        // Sign the transaction using TronLink adapter
        const signedTx = await tronLinkAdapter.signTransaction(rawTransaction);
        // Send the signed transaction
        const result = await tronWeb.trx.sendRawTransaction(signedTx);
        if (result.result) {
          setApproveHash(result.transaction.txID);
          return result.transaction.txID;
        } else {
          throw new Error(result.message || "Failed to send transaction");
        }
      } catch (error) {
        console.error(error);
        return null;
      }
    },
  });

  const haveRouter = quotes && quotes?.length >= 1;

  /**
   * Determine if permitSign is required
   *
   * For TRC20 tokens, permitSign is needed in these cases:
   * 1. When swapping from a TRC20 token (fromToken.address is not empty)
   * 2. When the DEX requires permit signature (e.g., Tomo DEX)
   * 3. When using specific contract addresses that require permit
   *
   * Note: This is typically required only for a user's first transaction with a specific token/DEX pair.
   * Subsequent transactions may not require approval if sufficient allowance exists.
   */
  const needPermitSign = !!(
    haveRouter &&
    quoteParamsMock.fromToken.address &&
    (quotes[0].dexInfo.name === "Tomo" || quotes[0].contract === "TTHLjdq1suzroV7AEAvLQYm1UNbTqvnuZY")
  );

  /**
   * Generate and sign permit data for TRC20 token approval
   *
   * This mutation handles the permit signing process:
   * 1. Gets Tron permit type data from the SDK
   * 2. Signs the permit data (in a real app, this would use the wallet)
   * 3. Generates API Tron permit parameters for transaction building
   *
   * Important: This step is only required for TRC20 tokens when:
   * - It's the user's first interaction with this token/DEX pair
   * - Or when the existing allowance is insufficient
   * After approval, users need to click "builder" again to generate the actual swap transaction.
   */

  const {
    mutate: permitSign,
    data: permitSignParams,
    isPending: isPermitSignPending,
  } = useMutation({
    mutationKey: [
      "business.permitSign",
      JSON.stringify({
        quoteParamsMock,
        needPermitSign,
      }),
    ],
    mutationFn: async () => {
      if (!needPermitSign) return null;

      // In a real application, you would use the wallet to sign the permit data
      // For this example, we'll just return placeholder data
      const permitTypeData = await business.tron.getPermitTypeData(quoteParamsMock, quotes[0]);
      const signature = await window.tronLink?.request({
        method: "tron_signTypedData",
        params: [address, permitTypeData],
      });
      return { signature, permitTypeData };
    },
  });

  /**
   * Build unsigned transaction using business.swapBuilder()
   *
   * This mutation will:
   * 1. Take the first (best) quote from quotes array
   * 2. Call the SDK's swapBuilder method
   * 3. Return an unsigned transaction ready for signing
   *
   * Note: This is only enabled when quotes are available
   * If permitSignParams are available, they will be included in the transaction
   *
   * Transaction structure:
   * {
   *   "rawDataHex": "0x...", // Serialized transaction data in hex format
   *   "chainId": 195 // Tron mainnet chain ID
   * }
   */

  const {
    mutate: builder,
    data: transaction,
    isPending: isBuilderPending,
  } = useMutation({
    mutationKey: [
      "business.swapBuilder",
      JSON.stringify({
        quoteParamsMock,
      }),
      !!permitSignParams,
    ],
    mutationFn: async () => {
      // Ensure we have quotes before building transaction
      if (!quotes) return null;

      // Use the first (best) quote to build transaction
      const transaction = await business.swapBuilder(quotes[0], quoteParamsMock, permitSignParams);
      return transaction;
    },
  });

  /**
   * Send transaction using TronWeb
   *
   * This mutation handles the actual transaction sending:
   * 1. Takes the built transaction from swapBuilder
   * 2. Signs and sends it via TronWeb
   * 3. Returns the transaction hash
   */
  const {
    mutate: send,
    data: hash,
    isPending: isSendPending,
  } = useMutation({
    mutationKey: ["tron.send", JSON.stringify({ transaction })],
    mutationFn: async () => {
      try {
        if (!transaction || !tronWeb || !tronLinkAdapter) return null;
        // Convert hex string to byte array
        const rawTransaction = (transaction as TransactionTRON).rawData;
        // Sign the transaction using TronLink adapter
        const signedTx = await tronLinkAdapter.signTransaction(rawTransaction);
        // Send the signed transaction
        const result = await tronWeb.trx.sendRawTransaction(signedTx);
        if (result.result) {
          return result.transaction.txID;
        } else {
          throw new Error(result.message || "Failed to send transaction");
        }
        // In a real application, you would sign and send the transaction using the wallet provider
        // For this example, we'll just return a placeholder hash
      } catch (error) {
        console.error(error);
        return "";
      }
    },
  });

  const connected = !!address;

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        {connected ? (
          <div>
            <div>Connected Address: {address}</div>
            <Button variant="outline-primary" size="sm" onClick={disconnectWallet} style={{ marginTop: "10px" }}>
              Disconnect Wallet
            </Button>
          </div>
        ) : (
          <Button variant="primary" onClick={connectWallet}>
            Connect Wallet
          </Button>
        )}
      </div>
      {connected && (
        <>
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
            placeholder="Amount (SUN)"
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

          {quotes && (
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

          {haveRouter && quoteParamsMock.fromToken.address && (
            <>
              {approveTransaction ? (
                <>
                  <p>approveTransaction</p>
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
                    <pre>{JSON.stringify(approveTransaction, null, 2)}</pre>
                  </div>
                  {/* approveHash */}
                  <Row style={{ marginBottom: "20px" }}>
                    <Col md={6}>
                      <Button
                        disabled={isApprovePending}
                        onClick={() => {
                          approve();
                        }}
                      >
                        approveSend
                      </Button>
                    </Col>
                  </Row>

                  {approveHash && (
                    <>
                      <div>Approve Transaction Hash: {approveHash}</div>
                      <a
                        href={`https://tronscan.org/#/transaction/${approveHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#007bff", textDecoration: "underline" }}
                      >
                        View on Explorer
                      </a>
                    </>
                  )}
                </>
              ) : (
                <p>{approveTxFetched ? "approved" : "approveChecking"}</p>
              )}
            </>
          )}

          {haveRouter && !approveTransaction && approveTxFetched && (
            <>
              {needPermitSign && (
                <Row style={{ marginBottom: "20px" }}>
                  <Col md={6}>
                    <Button
                      disabled={isPermitSignPending}
                      onClick={() => {
                        permitSign();
                      }}
                    >
                      permitSign
                    </Button>
                  </Col>
                </Row>
              )}

              {permitSignParams && (
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
                  <pre>{JSON.stringify(permitSignParams.signature, null, 2)}</pre>
                </div>
              )}

              <Row style={{ marginBottom: "20px" }}>
                <Col md={6}>
                  <Button
                    disabled={isBuilderPending || (needPermitSign && !permitSignParams)}
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
                    href={`https://tronscan.org/#/transaction/${hash}`}
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
      )}
    </div>
  );
};

const Tron = () => {
  return <TronWalletContent />;
};

export default Tron;
