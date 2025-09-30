# README

```
pnpm install
pnpm dev
```

## Config Setup
1. contact tomo.inc, get config data
2. setup config.ts
3. replace import path

```
//before
import { CONFIG } from "./config.test";

//after
import { CONFIG } from "./config";
```

## Wallet SDK demo

> doc: ./src/social-wallet-demo.md

> router: /

introduce: social login, wallet apis


## Transaction Builder

> router: /transaction-buidler

introduce: swap, bridge transaction builder

after build: sign with wallet and broadcast.
