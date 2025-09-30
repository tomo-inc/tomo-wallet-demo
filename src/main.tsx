import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Polyfill process for browser environment
if (typeof globalThis.process === 'undefined') {
  globalThis.process = require('process');
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
