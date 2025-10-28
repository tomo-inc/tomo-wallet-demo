import {
  ChainTypes,
  TomoAppConfig,
  TomoWallet,
  TransactionItem,
  TransactionsParams,
  TransactionsResponse,
  TxTypes,
} from "@tomo-inc/social-account-sdk";
import { CONFIG } from "./config";

export default function WalletApiDemo({ walletId }: { walletId: string }) {
  const tomoAppConfig: TomoAppConfig = {
    tomoStage: CONFIG.tomoStage as "dev" | "prod",
    tomoClientId: CONFIG.tomoClientId,
    apiKey: CONFIG.apiKey,
    apiSecret: CONFIG.apiSecret,
    salt: CONFIG.salt,
  };
  const wallet = new TomoWallet(walletId, tomoAppConfig);

  return (
    <div className="bg-gray-100 p-2">
      <button
        className="m-2 bg-[#999] p-1"
        onClick={async () => {
          const chainInfo = await wallet?.getChainInfo(ChainTypes.EVM, "8453");
          const chainInfo2 = await wallet?.getChainInfo(ChainTypes.EVM, "221122420");
          console.log("getChainInfo", chainInfo, chainInfo2);
        }}
      >
        getChainInfo
      </button>

      <button
        className="m-2 bg-[#999] p-1"
        onClick={async () => {
          const res = await wallet?.supportedChains(ChainTypes.EVM);
          console.log("supportedChains evm:", res);

          const res2 = await wallet?.supportedChains("");
          console.log("supportedChains all:", res2);
        }}
      >
        supportedChains
      </button>
      <button
        className="m-2 bg-[#999] p-1"
        onClick={async () => {
          const res1 = await wallet?.isChainSupported(ChainTypes.EVM, "8453");
          console.log("isChainSupported base:", res1);

          const res2 = await wallet?.isChainSupported(ChainTypes.EVM, "111222333444");
          console.log("isChainSupported 111222333444:", res2);

          const res3 = await wallet?.isChainSupported(ChainTypes.DOGE, "3");
          console.log("isChainSupported doge 3:", res3);
        }}
      >
        isChainSupported
      </button>

      <button
        className="m-2 bg-[#999] p-1"
        onClick={async () => {
          //record of swap on base chain
          const params: TransactionsParams = {
            chainId: "8453",
            cursor: "",
            typeList: [TxTypes.swap],
            pageLimit: 50,
          };
          const { cursor, transactionList } = (await wallet?.getTransactions(params)) || ({} as TransactionsResponse);
          const tx1: TransactionItem = transactionList[0];
          console.log("getTransactions", params, { cursor, transactionList }, tx1);

          //records of token
          const params2: TransactionsParams = {
            tokenAddress: "token.Address",
            typeList: [
              TxTypes.swap,
              TxTypes.bridge,
              TxTypes.receive,
              TxTypes.send,
              TxTypes.approve,
              TxTypes.contractInteraction,
              TxTypes.redPocket,
            ],
            cursor: "",
            pageLimit: 50,
          };
          console.log("getTransactions2", params2);
        }}
      >
        getTransactions
      </button>
    </div>
  );
}
