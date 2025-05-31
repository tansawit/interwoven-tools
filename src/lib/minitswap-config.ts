export const minitswapConfig = {
  initMetadata:
    process.env.NEXT_PUBLIC_INIT_METADATA ||
    '0x8e4733bdabcf7d4afc3d14f0dd46c9bf52fb0fce9e4b996c939e195b8bc891d9',
  interval: Number(process.env.NEXT_PUBLIC_INTERVAL || '3600000'),
  offerRatios: (process.env.NEXT_PUBLIC_OFFER_RATIOS || '0.1,0.2,0.5')
    .split(',')
    .map((r) => Number(r)),
  registryUri: process.env.NEXT_PUBLIC_REGISTRY_URI || 'https://registry.initia.xyz',
  restUri: process.env.REST_URI || 'https://rest.initia.xyz',
};
