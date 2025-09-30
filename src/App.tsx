import { BrowserRouter, Route, Routes } from "react-router-dom";

import SocialWalletDemo from "./social-wallet-demo";
// import TransactionBuilder from "./transaction-builder";

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* <div className="p-3 bg-[skyblue]">
        demos:
        <a href="/" className="ml-2">
          social-wallet-demo
        </a>
        <a href="/transaction-builder" className="ml-2">
          transaction-builder
        </a>
      </div> */}
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SocialWalletDemo />} />
          {/* <Route path="/transaction-builder" element={<TransactionBuilder />} /> */}
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
