# Interwoven Tools

A collection of useful tools for the Initia / Interwoven ecosystem, built with Next.js 16 (App Router), React 19 and Tailwind CSS v4.

| Tool | Path | Data sources |
| --- | --- | --- |
| Address Converter | `/address-converter` | — (runs in the browser) |
| Staking | `/staking` | `rest.initia.xyz`, `dex-api.initia.xyz` (via `/api/staking`) |
| VIP Scores | `/vip-scores` | `vip-api.initia.xyz`, rollup REST / JSON-RPC endpoints |
| Block Time Calculator | `/block-time` | rollup RPC (`/blockchain`), REST fallback |
| Assets Distribution | `/assets-distribution` | Initia registry + bank supply (via `/api/assets-distribution`) |
| LST Pools | `/lst-pools` | `dex-api.initia.xyz` v2 |
| Asset Registry | `/registry/assets` | testnet registry |

Chain metadata comes from the [Initia registry](https://registry.initia.xyz/chains.json).
The API routes cache upstream data in memory (stale-while-revalidate) and send CDN cache headers.

## Development

```bash
bun install
bun dev        # http://localhost:3000
bun run lint
bun run build
```
