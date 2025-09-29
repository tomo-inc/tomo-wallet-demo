import { useMutation, useQuery } from "@tanstack/react-query";
import { Business, type Chain, type TransactionEVM } from "@tomo-inc/transaction-builder-sdk";
import { useState } from "react";
import { Button, Col, Row } from "react-bootstrap";
import { Hex } from "viem";
import { useAccount, useChainId, useSendTransaction, useSignTypedData } from "wagmi";
import { Account } from "./account";
import Input from "./input";
import { WalletOptions } from "./wallet-options";

import { CONFIG } from "../config.test";

const EVM = () => {
  const { isConnected, address, isReconnecting, isConnecting } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const { sendTransactionAsync } = useSendTransaction();
  const chainId = useChainId();
  const business = new Business({
    config: {
      API_KEY: CONFIG.apiKey,
      API_SECRET: CONFIG.apiSecret,
      SALT: CONFIG.salt,
      CLIENT_ID: "",
    },
    tomoStage: CONFIG.tomoStage,
  });

  const [amount, setAmount] = useState("10000000000000");
  const [slippage, setSlippage] = useState(5);
  const [fromTokenAddress, setFromTokenAddress] = useState(""); // Native token (ETH)
  const [toTokenAddress, setToTokenAddress] = useState("0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d"); // USDC
  const [approveHash, setApproveHash] = useState("");

  // Get all supported chains and find current chain
  const chains = business.getSwapSupportChains();
  const currentChain = chains.find((item) => item.chainId === chainId);

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
   *     "dexInfo": { "name": "Uniswap", "logo": "..." },
   *     "amountIn": "10000000000000",
   *     "amountOut": "45095",
   *     "gasNetWorkFee": "0.00123",
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
   * Generate ERC20 token approval transaction
   *
   * When swapping from an ERC20 token, an approval transaction may be required
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
        return transaction ? (transaction as TransactionEVM) : null;
      } catch {
        return null;
      }
    },
  });

  /**
   * Send ERC20 token approval transaction
   *
   * This mutation handles sending the approval transaction via wagmi:
   * 1. Takes the approval transaction from getApproveBuilder
   * 2. Sends it via wagmi's sendTransactionAsync
   * 3. Updates the approveHash state for query invalidation
   */
  const { mutate: approve, isPending: isApprovePending } = useMutation({
    mutationKey: ["wagmi.send", JSON.stringify({ approveTransaction })],
    mutationFn: async () => {
      if (!approveTransaction) return null;
      const tx = approveTransaction as TransactionEVM;
      if (tx.gas && tx.maxFeePerGas && tx.maxPriorityFeePerGas) {
        const hash = await sendTransactionAsync({
          to: tx.to as Hex,
          data: tx.data as Hex,
          value: BigInt(tx.value),
          gas: BigInt(tx.gas),
          maxFeePerGas: BigInt(tx.maxFeePerGas),
          maxPriorityFeePerGas: BigInt(tx.maxPriorityFeePerGas),
        });
        setApproveHash(hash);
        return hash;
      }
    },
  });

  const haveRouter = quotes && quotes?.length >= 1;

  /**
   * Determine if permitSign is required
   *
   * For ERC20 tokens, permitSign is needed in these cases:
   * 1. When swapping from an ERC20 token (fromToken.address is not empty)
   * 2. When the DEX requires permit signature (e.g., Tomo DEX)
   * 3. When using specific contract addresses that require permit
   *
   * Note: This is typically required only for a user's first transaction with a specific token/DEX pair.
   * Subsequent transactions may not require approval if sufficient allowance exists.
   */
  const needPermitSign = !!(
    haveRouter &&
    quoteParamsMock.fromToken.address &&
    (quotes[0].dexInfo.name === "Tomo" || quotes[0].contract === "0xcF74F56112f260DdEe729753553FbD18509DEF8F")
  );

  /**
   * Generate and sign permit data for ERC20 token approval
   *
   * This mutation handles the permit signing process:
   * 1. Gets EVM permit type data from the SDK
   * 2. Signs the permit data using wallet (signTypedData)
   * 3. Generates API EVM permit parameters for transaction building
   *
   * Important: This step is only required for ERC20 tokens when:
   * - It's the user's first interaction with this token/DEX pair
   * - Or when the existing allowance is insufficient
   * After approval, users need to click "builder" again to generate the actual swap transaction.
   */
  const {
    mutate: permitSign,
    data: permitSignParams,
    isPending: isPermitSignPending,
  } = useMutation({
    mutationKey: ["business.permitSign", JSON.stringify({ quoteParamsMock, needPermitSign })],
    mutationFn: async () => {
      if (!needPermitSign) return null;

      const permitTypeData = await business.evm.getPermitTypeData(quoteParamsMock, quotes[0]);

      const signature = await signTypedDataAsync({
        ...permitTypeData,
        primaryType: "PermitSingle",
        account: address,
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
   *   "to": "0x...", // Router contract address
   *   "data": "0x...", // Encoded transaction data
   *   "value": "10000000000000", // ETH amount to send (if swapping ETH)
   *   "chainId": 1 // Network chain ID
   * }
   */
  const {
    mutate: builder,
    data: transaction,
    isPending: isBuilderPending,
  } = useMutation({
    mutationKey: ["business.swapBuilder", JSON.stringify({ quoteParamsMock, permitSignParams })],
    mutationFn: async () => {
      // Ensure we have quotes before building transaction
      if (!quotes) return null;

      // Use the first (best) quote to build transaction
      const transaction = await business.swapBuilder(quotes[0], quoteParamsMock, permitSignParams);
      return transaction;
    },
  });

  /**
   * Send transaction using wagmi's sendTransaction
   *
   * This mutation handles the actual transaction sending:
   * 1. Takes the built transaction from swapBuilder
   * 2. Sends it via wagmi's sendTransactionAsync
   * 3. Returns the transaction hash
   *
   * For ERC20 tokens, users may need two transactions:
   * 1. First: permitSign (token approval) - only required for first interaction
   * 2. Second: swap transaction - executes the actual token swap
   *
   * After the first transaction (approval), users must click "builder" again
   * to generate the second transaction (swap) before sending.
   */
  const {
    mutate: send,
    data: hash,
    isPending: isSendPending,
  } = useMutation({
    mutationKey: ["wagmi.send", JSON.stringify({ transaction })],
    mutationFn: async () => {
      if (!transaction) return null;
      const tx = transaction as TransactionEVM;
      if (tx.gas && tx.maxFeePerGas && tx.maxPriorityFeePerGas) {
        const hash = await sendTransactionAsync({
          to: tx.to as Hex,
          data: tx.data as Hex,
          value: BigInt(tx.value),
          gas: BigInt(tx.gas),
          maxFeePerGas: BigInt(tx.maxFeePerGas),
          maxPriorityFeePerGas: BigInt(tx.maxPriorityFeePerGas),
        });
        return hash;
      }
    },
  });

  return (
    <div>
      {isConnected ? (
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
            placeholder="Amount (wei)"
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
                disabled={isQuotePending || isReconnecting}
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
              <pre>{JSON.stringify(quotes)}</pre>
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
                    <pre>{JSON.stringify(approveTransaction)}</pre>
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
                        href={`${currentChain?.blockExplorerUrl}/tx/${approveHash}`}
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
                  <pre>{JSON.stringify(permitSignParams)}</pre>
                </div>
              )}

              <Row style={{ marginBottom: "20px" }}>
                <Col md={6}>
                  <Button
                    disabled={isBuilderPending || isReconnecting || (needPermitSign && !permitSignParams)}
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
                  <pre>{JSON.stringify(transaction)}</pre>
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
                    href={`${currentChain?.blockExplorerUrl}/tx/${hash}`}
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
          <WalletOptions />
          {isConnecting && <p>Connecting...</p>}
        </>
      )}
    </div>
  );
};

export default EVM;
