# Sign in with wallet

## Sign in
dapp call wallet api, get signature

### 1. sign in with ethereum
doc: https://docs.metamask.io/wallet/how-to/sign-data/siwe/
example: https://dapp-demo.tomo.inc/solana + metamask(chrome extension)

```
const signInData = {
  scheme: "https",
  domain: window.location.host,
  address,
  uri: window.location.origin,
  statement: "Clicking Sign or Approve only means you have proved this wallet is owned by you. This request will not trigger any blockchain transaction or cost any gas fee.",
  version: "1",
  chainId: "1",
  nonce: "123",
  issuedAt: "2021-09-30T16:25:24.000Z",
  resources: ["https://example.com", "https://example2.app/"],
};

const siweMessage = `${signInData.scheme}://${signInData.domain} wants you to sign in with your Ethereum account:`
  + `\n${signInData.address}`

  + `\n\n${signInData.statement}`

  + `\n\nURI: ${signInData.uri}`
  + `\nVersion: ${signInData.version}`
  + `\nChain ID: ${signInData.chainId}`
  + `\nNonce: ${signInData.nonce}`
  + `\nIssued At: ${signInData.issuedAt}`
  + `\nExpiration Time: ${signInData.expirationTime}`
  + `\nNot Before: ${signInData.notBefore}`
  + `\nRequest ID: ${signInData.requestId}`
  + `\nResources:`
  + `\n- ${signInData.resources[0]}`
  + `\n- ${signInData.resources[1]}`;

// const msg = `0x${Buffer.from(siweMessage, "utf8").toString("hex")} `
const sign = await provider.request({
  method: "personal_sign",
  params: [siweMessage, address],
});
```

**wallet support**:

1. show siwe message follows the SIWE format
2. warning if domain in the message doesn't match the site the user is on

### 2. sign in with solana
doc: https://github.com/phantom/sign-in-with-solana
example: https://dapp-demo.tomo.inc/solana + phantom(chrome extension)

```
const provider = window.phantom.solana;

const signInData = {
  domain: window.location.host,
  statement: "Clicking Sign or Approve only means you have proved this wallet is owned by you. This request will not trigger any blockchain transaction or cost any gas fee.",
  version: "1",
  nonce: "oBbLoEldZs",
  issuedAt: new Date().toISOString(),
  resources: ["https://example.com", "https://phantom.app/"],
};
const { address, signature, signedMessage } = await provider.signIn(signInData);
```

**wallet support**:

1. one-click **signIn** method
2. show siwe message follows the SIWE format
3. warning if domain in the message doesn't match the site the user is on



## Verify signature

1. dapp post signature and signInData to backend
2. verify signature and login



### verify method

1. ethereum: https://viem.sh/docs/siwe/actions/verifySiweMessage
2. solana: https://github.com/phantom/sign-in-with-solana?tab=readme-ov-file#sign-in-output-verification-backend