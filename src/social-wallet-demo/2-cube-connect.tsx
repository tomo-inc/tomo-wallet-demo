import { useEffect, useState } from "react";
import QRCode from "react-qr-code";

import { CubeConfig, CubeConnect, CubeConnectResult, MfaConfig, TotpInfo } from "@tomo-inc/social-account-sdk";
import { CONFIG } from "./config.test";

export default function CubeConnectDemo({
  oidcToken,
  onConnected,
}: {
  oidcToken: string;
  onConnected: (result: CubeConnectResult) => void;
}) {
  const [cubeConnect, setCubeConnect] = useState<any>(null);
  const [mfaConfig, setMfaConfig] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const config: CubeConfig = {
        tomoStage: CONFIG.tomoStage as "dev" | "prod",
        tomoClientId: CONFIG.tomoClientId,
        oidcToken,
        name: CONFIG.name,
        logo: CONFIG.logo,
      };
      const cubeConnect = await CubeConnect(config);
      setCubeConnect(cubeConnect);

      const { cubeAccount, cubeMfa }: any = cubeConnect || {};
      if (!cubeAccount || !cubeMfa) {
        throw new Error("cubeAccount or cubeMfa is not found");
        return;
      }
      const accountData: CubeConnectResult = cubeAccount?.accountData || {};
      setUser(accountData.user);

      const mfaConfig: MfaConfig = await cubeAccount.getMfaConfig();
      setMfaConfig(mfaConfig);
      console.log("mfaConfig:", mfaConfig);

      if (mfaConfig.noMfa) {
        onConnected(cubeAccount?.accountData);
      }
    })();
  }, [oidcToken]);

  if (!user) {
    return null;
  }

  return (
    <>
      <h1 className="text-2xl font-bold mt-2">Mfa config:</h1>
      <div className="flex justify-between gap-2 border-4 border-[skyblue] mx-1">
        <div>
          <div className="bg-[skyblue] p-2">user: {user?.username || user?.nickname}</div>
          <div>
            <button
              className="bg-[#999] m-2"
              onClick={async () => {
                console.log("rename result:", user);
              }}
            >
              userInfo
            </button>
            <button
              className="bg-[#999] m-2"
              onClick={async () => {
                const r = Date.now() % 10;
                const result = await cubeConnect?.cubeAccount?.updateUserInfo({
                  nickname: "newNickname_" + r,
                  avatar: "https://www.google.com/avatar.png?=" + r,
                });
                console.log("rename result:", result);
              }}
            >
              reanme
            </button>
            <button
              className="bg-[#999] m-2"
              onClick={async () => {
                const mfaConfig = await cubeConnect?.cubeAccount?.getMfaConfig();
                setMfaConfig(mfaConfig);
                console.log("mfaConfig:", mfaConfig);
              }}
            >
              mfaConfig
            </button>
            <button
              className="bg-[#999] m-2"
              onClick={async () => {
                window.localStorage.clear();
                await cubeConnect?.cubeAccount?.sessionRevoke();
                window.location.reload();
              }}
            >
              logout
            </button>
          </div>
          <CreateWalletDemo onConnected={onConnected} cubeConnect={cubeConnect} mfaConfig={mfaConfig} />
        </div>

        {cubeConnect && (
          <>
            <FidoDemo mfaConfig={mfaConfig} cubeConnect={cubeConnect} />
            <TotpDemo mfaConfig={mfaConfig} cubeConnect={cubeConnect} />
            <ExportDemo cubeConnect={cubeConnect} />
          </>
        )}
      </div>
    </>
  );
}

const CreateWalletDemo = ({
  cubeConnect,
  mfaConfig,
  onConnected,
}: {
  cubeConnect: any;
  mfaConfig: MfaConfig;
  onConnected: (result: CubeConnectResult) => void;
}) => {
  const [totpCode, setTotpCode] = useState<string>("");

  return (
    <>
      {mfaConfig?.fido?.enabled && (
        <div>
          <button
            className="bg-[#999] m-2"
            onClick={async () => {
              const { cubeAccount, cubeMfa } = cubeConnect || {};

              const mfaInfo = (await cubeAccount.createSession()) as any;
              cubeMfa.setMfaType("fido");
              const res = await cubeMfa.executeBizWithMfa("createSession", mfaInfo);
              console.log("createSession with fido", res, cubeConnect);

              if (res.success) {
                onConnected(cubeAccount?.accountData);
              } else {
                console.error("createSession err", res?.message);
              }
            }}
          >
            create session with fido
          </button>
        </div>
      )}

      {mfaConfig?.totp?.enabled && (
        <div>
          <button
            className="bg-[#999] m-2"
            onClick={async () => {
              const { cubeAccount } = cubeConnect || {};
              const mfaInfo = await cubeAccount.createSession();
              console.log("createSession with totp", mfaInfo);
            }}
          >
            create session with totp
          </button>
          <br />
          totp code:{" "}
          <input className="bg-[#999] m-2" type="text" value={totpCode} onChange={(e) => setTotpCode(e.target.value)} />
          <button
            className="bg-[#999] m-2"
            onClick={async () => {
              const { cubeMfa, cubeAccount } = cubeConnect || {};

              cubeMfa.setMfaType("totp");
              cubeMfa.setMfaAnswer({ totpCode });
              const res = await cubeMfa.executeBizWithMfa("createSession");
              console.log("createSession with totp", res, cubeConnect);

              if (res.success) {
                onConnected(cubeAccount?.accountData);
              } else {
                console.error("createSession err", res?.message);
              }
            }}
          >
            confirm
          </button>
        </div>
      )}
    </>
  );
};

const FidoDemo = ({ mfaConfig, cubeConnect }: { mfaConfig: MfaConfig; cubeConnect: any }) => {
  const [totpCode, setTotpCode] = useState<string>("");

  return (
    <div>
      <div className="bg-[skyblue] p-2">add/delete passkey</div>
      <div>
        {mfaConfig?.fido?.data[0]?.id && (
          <div>
            delete setp1:{" "}
            <button
              className="bg-[#999] m-2"
              onClick={async () => {
                const { cubeMfa } = cubeConnect || {};
                const mfaInfo = await cubeMfa.deleteFido(mfaConfig.fido.data[0].id);
                console.log("deleteFido:", mfaInfo);
              }}
            >
              deleteFido
            </button>{" "}
            <br />
            delete setp2:
            <input
              className="bg-[#999] text-[#ffffff] m-2"
              type="text"
              placeholder="totp code"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
            />
            <button
              className="bg-[#999] m-2"
              onClick={async () => {
                const { cubeMfa } = cubeConnect || {};
                cubeMfa.setMfaType("totp");
                cubeMfa.setMfaAnswer({ totpCode });
                const res = await cubeMfa.executeBizWithMfa("deleteFido");
                console.log("deleteFido:", res);
              }}
            >
              deleteFido with totp
            </button>
          </div>
        )}
        add setp1:{" "}
        <button
          className="bg-[#999] m-2"
          onClick={async () => {
            const { cubeMfa } = cubeConnect || {};
            const mfaInfo = await cubeMfa.addFido("userName@deviceType@prodcutName");
            console.log("addFido:", mfaInfo);
            cubeMfa.setMfaType("totp");
          }}
        >
          add with totp
        </button>{" "}
        <br />
        add setp2:
        <input
          className="bg-[#999] text-[#ffffff] m-2"
          type="text"
          placeholder="totp code"
          value={totpCode}
          onChange={(e) => setTotpCode(e.target.value)}
        />
        <button
          className="bg-[#999] m-2"
          onClick={async () => {
            const { cubeMfa } = cubeConnect || {};
            cubeMfa.setMfaAnswer({ totpCode });
            const res = await cubeMfa.executeBizWithMfa("addFido");
            console.log("addFido with totp", res);
          }}
        >
          confirm
        </button>
      </div>
    </div>
  );
};

const TotpDemo = ({ mfaConfig, cubeConnect }: { mfaConfig: MfaConfig; cubeConnect: any }) => {
  const issuer = "productName";
  const [totpInfo, setTotpInfo] = useState<TotpInfo | null>(null);
  const [totpCode, setTotpCode] = useState<string>("");
  const [emailCode, setEmailCode] = useState<string>("");

  return (
    <div>
      <div className="bg-[skyblue] p-2">register and delete totp</div>

      {totpInfo?.url && (
        <div className="p-2 bg-[#dedede]">
          <div className="border-l1 rounded-1 flex h-[172px] w-[172px] items-center justify-center border-[1px] bg-[green]">
            <QRCode value={totpInfo.url} className="h-[172px] w-[172px]" level="M" />
          </div>
          <div>secret: {totpInfo.secret}</div>
        </div>
      )}

      {mfaConfig?.totp?.enabled ? (
        <div>
          step1:
          <button
            className="bg-[#999] m-2"
            onClick={async () => {
              const { cubeMfa } = cubeConnect || {};
              const mfaInfo = await cubeMfa.deleteTotp();
              console.log("deleteTotp:", mfaInfo);
            }}
          >
            deleteTotp
          </button>{" "}
          <br />
          step2:{" "}
          <button
            className="bg-[#999] m-2"
            onClick={async () => {
              const { cubeMfa } = cubeConnect || {};
              cubeMfa.setMfaType("fido");
              const res = await cubeMfa.executeBizWithMfa("deleteTotp");
              console.log("deleteTotp:", res);
            }}
          >
            deleteTotp with fido
          </button>
        </div>
      ) : (
        <div>
          step1:{" "}
          <button
            className="bg-[#999] m-2"
            onClick={async () => {
              const { cubeMfa } = cubeConnect || {};
              const mfaInfo = await cubeMfa.registerTotp(issuer);
              console.log("registerTotp:", mfaInfo);
            }}
          >
            registerTotp
          </button>{" "}
          <br />
          step2:{" "}
          <button
            className="bg-[#999] m-2"
            onClick={async () => {
              const { cubeMfa } = cubeConnect || {};
              cubeMfa.setMfaType("fido");
              const res = await cubeMfa.executeBizWithMfa("registerTotp");
              console.log("registerTotp:", res);

              let totpInfo = res.data;

              const account = mfaConfig?.account;
              const email = account?.otpEmail || account?.email;
              const username = email || account?.name || account?.accountType;
              const totpInfoLink = totpInfo.url.replace(`/${issuer}:?secret`, `/${issuer}:${username}?secret`);
              totpInfo = { ...totpInfo, url: totpInfoLink };
              setTotpInfo(totpInfo);
            }}
          >
            registerTotp with fido
          </button>{" "}
          <br />
          <div>step2(emailOtp): todo</div>
          step3:
          <input
            className="bg-[#999] text-[#ffffff] m-2"
            type="text"
            placeholder="totp code"
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value)}
          />
          <button
            className="bg-[#999] m-2"
            onClick={async () => {
              const { cubeMfa } = cubeConnect || {};
              const res = await cubeMfa.answerRegister(totpCode);
              console.log("answerRegister:", res);
            }}
          >
            answerRegister
          </button>
        </div>
      )}
    </div>
  );
};

const ExportDemo = ({ cubeConnect }: { cubeConnect: any }) => {
  const { cubeExport, cubeMfa } = cubeConnect;
  const [totpCode, setTotpCode] = useState<string>("");

  return (
    <div>
      <div className="bg-[skyblue] p-2">export seed phrase</div>
      <input
        className="bg-[#999] text-[#ffffff] m-2 p-1"
        type="text"
        placeholder="totp code"
        value={totpCode}
        onChange={(e) => setTotpCode(e.target.value)}
      />
      <br />
      <button
        className="m-2 bg-[#999] p-1"
        onClick={async () => {
          const exportInfo = await cubeExport.getExportInfo();
          console.log("exportInfo:", exportInfo);
        }}
      >
        export info
      </button>
      <br />
      <button
        className="m-2 bg-[#999] p-1"
        onClick={async () => {
          await cubeExport.initExport();
          cubeMfa.setMfaType("fido");
          const res = await cubeMfa.executeBizWithMfa("initExport");
          console.log("init export with fido:", res);
        }}
      >
        init export with fido
      </button>{" "}
      <button
        className="m-2 mt-2 bg-[#999] p-1"
        onClick={async () => {
          cubeMfa.setMfaType("totp");
          cubeMfa.setMfaAnswer({ totpCode });
          await cubeExport.initExport();
          const res = await cubeMfa.executeBizWithMfa("initExport");
          console.log("init export retry with totp:", res);
        }}
      >
        init export with totp
      </button>{" "}
      <br />
      <button
        className="m-2 bg-[#999] p-1"
        onClick={async () => {
          await cubeExport.completeExport();
          cubeMfa.setMfaType("fido");
          const res = await cubeMfa.executeBizWithMfa("completeExport");
          console.log("complete export:", res);
        }}
      >
        completeExport with fido
      </button>{" "}
      <button
        className="m-2 bg-[#999] p-1"
        onClick={async () => {
          await cubeExport.completeExport();
          cubeMfa.setMfaType("totp");
          cubeMfa.setMfaAnswer({ totpCode });
          const res = await cubeMfa.executeBizWithMfa("completeExport");
          console.log("complete export:", res);
        }}
      >
        completeExport with totp
      </button>{" "}
      <br />
      <button
        className="m-2 bg-[#999] p-1"
        onClick={async () => {
          const res = await cubeExport.deleteExport();
          console.log("cancel export:", res);
        }}
      >
        deleteExport
      </button>
    </div>
  );
};
