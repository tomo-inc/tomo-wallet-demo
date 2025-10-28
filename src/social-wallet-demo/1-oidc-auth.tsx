import { useState } from "react";

import { EmailLoginResult, LoginType, OidcAuth } from "@tomo-inc/social-account-sdk";
import { CONFIG } from "./config";

export default function OidcAuthDemo({
  onLogin,
}: {
  onLogin: ({ oidcToken, loginType }: { oidcToken: string; loginType: LoginType }) => void;
}) {
  const config = {
    xClientId: CONFIG.xClientId,
    googleClientId: CONFIG.googleClientId,
    tomoStage: CONFIG.tomoStage as "dev" | "prod",
  };

  const { loginByGoogle, loginByX, loginByEmail } = OidcAuth(config);

  const [email, setEmail] = useState("");
  const [partialOidcToken, setPartialOidcToken] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [timer, setTimer] = useState(0);

  return (
    <div className="bg-gray-100 p-2">
      <button
        className="m-2 bg-[#999] p-1"
        onClick={async () => {
          const oidcToken = await loginByGoogle();
          onLogin({ oidcToken, loginType: "google" });
        }}
      >
        loginGoogle
      </button>
      <button
        className="m-2 bg-[#999] p-1"
        onClick={async () => {
          const oidcToken = await loginByX();
          onLogin({ oidcToken, loginType: "x" });
        }}
      >
        loginX
      </button>
      <div></div>
      <input
        type="text"
        className="m-1 bg-[#fff] p-1"
        value={email}
        placeholder="email"
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="text"
        className="m-1 bg-[#fff] p-1"
        value={emailCode}
        placeholder="emailCode"
        onChange={(e) => setEmailCode(e.target.value)}
      />{" "}
      {timer ? `duration: ${timer}` : ""}
      <button
        disabled={email === ""}
        className="m-1 bg-[#999] p-1"
        onClick={async () => {
          const { partialOidcToken, lifeTime }: EmailLoginResult = await loginByEmail(email);
          setTimer(lifeTime);
          setPartialOidcToken(partialOidcToken);
        }}
      >
        sendCode
      </button>
      <button
        disabled={emailCode === ""}
        className="m-1 bg-[#999] p-1"
        onClick={async () => {
          const oidcToken = `${partialOidcToken}${emailCode}`;
          onLogin({ oidcToken, loginType: "email" });
        }}
      >
        loginByEmail
      </button>
    </div>
  );
}
