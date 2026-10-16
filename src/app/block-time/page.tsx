'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calculator, Activity, RefreshCw } from 'lucide-react';
import { Chain, useChains } from '@/lib/hooks/useChains';
import { ChainSelector } from '@/components/ChainSelector';
import { fetchJson } from '@/lib/fetch-json';

interface BlockInfo {
  height: number;
  timestamp: string;
}

interface RestBlockResponse {
  block: { header: { height: string; time: string } };
}

interface RpcBlockchainResponse {
  result: {
    last_height: string;
    block_metas: Array<{ header: { height: string; time: string } }>;
  };
}

const SAMPLE_SIZE = 100;
// CometBFT's /blockchain endpoint returns at most 20 headers per request.
const RPC_PAGE_SIZE = 20;

/**
 * Fetches the headers of the latest SAMPLE_SIZE blocks (ascending by height).
 * Uses the lightweight RPC /blockchain endpoint (5 requests for headers only) and
 * falls back to one REST request per block (which includes every transaction).
 */
async function fetchRecentBlocks(chain: Chain): Promise<BlockInfo[]> {
  const rpcEndpoint = chain.apis?.rpc?.[0]?.address;
  if (rpcEndpoint) {
    try {
      return await fetchRecentBlocksFromRpc(rpcEndpoint);
    } catch (e) {
      console.warn('RPC block fetch failed, falling back to REST:', e);
    }
  }

  const restEndpoint = chain.apis?.rest?.[0]?.address;
  if (!restEndpoint) {
    throw new Error('No REST endpoint found for selected chain');
  }
  return fetchRecentBlocksFromRest(restEndpoint);
}

async function fetchRecentBlocksFromRpc(rpcEndpoint: string): Promise<BlockInfo[]> {
  const toBlockInfo = (meta: { header: { height: string; time: string } }): BlockInfo => ({
    height: parseInt(meta.header.height),
    timestamp: meta.header.time,
  });

  const latest = await fetchJson<RpcBlockchainResponse>(`${rpcEndpoint}/blockchain`);
  if (latest.result.block_metas.length === 0) {
    throw new Error('RPC returned no blocks');
  }
  const latestHeight = parseInt(latest.result.last_height);
  const startHeight = Math.max(1, latestHeight - (SAMPLE_SIZE - 1));

  const pages: Promise<RpcBlockchainResponse>[] = [];
  const firstFetchedHeight = Math.min(
    ...latest.result.block_metas.map((meta) => parseInt(meta.header.height))
  );
  for (let max = firstFetchedHeight - 1; max >= startHeight; max -= RPC_PAGE_SIZE) {
    const min = Math.max(startHeight, max - RPC_PAGE_SIZE + 1);
    pages.push(
      fetchJson<RpcBlockchainResponse>(`${rpcEndpoint}/blockchain?minHeight=${min}&maxHeight=${max}`)
    );
  }

  const metas = [latest, ...(await Promise.all(pages))].flatMap((page) => page.result.block_metas);
  return metas
    .map(toBlockInfo)
    .filter((block) => block.height >= startHeight)
    .sort((a, b) => a.height - b.height);
}

async function fetchRecentBlocksFromRest(restEndpoint: string): Promise<BlockInfo[]> {
  const blockUrl = (height: number | 'latest') =>
    `${restEndpoint}/cosmos/base/tendermint/v1beta1/blocks/${height}`;
  const toBlockInfo = (data: RestBlockResponse): BlockInfo => ({
    height: parseInt(data.block.header.height),
    timestamp: data.block.header.time,
  });

  const latest = toBlockInfo(await fetchJson<RestBlockResponse>(blockUrl('latest')));
  const startHeight = Math.max(1, latest.height - (SAMPLE_SIZE - 1));

  const blocks = await Promise.all(
    Array.from({ length: latest.height - startHeight }, (_, i) =>
      fetchJson<RestBlockResponse>(blockUrl(startHeight + i))
        .then(toBlockInfo)
        .catch(() => null)
    )
  );
  return [...blocks.filter((block): block is BlockInfo => block !== null), latest];
}

/** Median of the time between consecutive blocks, in seconds. */
function calculateMedianBlockTime(blocks: BlockInfo[]): number | null {
  if (blocks.length < 2) return null;

  const timeDifferences: number[] = [];
  for (let i = 1; i < blocks.length; i++) {
    const prevTime = new Date(blocks[i - 1].timestamp).getTime();
    const currTime = new Date(blocks[i].timestamp).getTime();
    const diffSeconds = (currTime - prevTime) / 1000;
    if (diffSeconds > 0 && diffSeconds < 60) {
      // Filter out unrealistic times
      timeDifferences.push(diffSeconds);
    }
  }

  if (timeDifferences.length === 0) return null;

  timeDifferences.sort((a, b) => a - b);
  const medianIndex = Math.floor(timeDifferences.length / 2);
  return timeDifferences.length % 2 === 0
    ? (timeDifferences[medianIndex - 1] + timeDifferences[medianIndex]) / 2
    : timeDifferences[medianIndex];
}

export default function BlockTimeCalculator() {
  // Use shared chains hook
  const {
    chains,
    selectedChain,
    setSelectedChain,
    loading: chainsLoading,
    error: chainsError,
    selectedChainData,
  } = useChains();

  const [currentBlock, setCurrentBlock] = useState<BlockInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [calculatedBlockTime, setCalculatedBlockTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Calculator inputs
  const [fromBlock, setFromBlock] = useState<string>('');
  const [toBlock, setToBlock] = useState<string>('');
  const [targetTime, setTargetTime] = useState<string>('');
  const [timeDays, setTimeDays] = useState<string>('');
  const [timeHours, setTimeHours] = useState<string>('');
  const [timeMinutes, setTimeMinutes] = useState<string>('');
  const [timeSeconds, setTimeSeconds] = useState<string>('');

  // Results
  const [blockDifference, setBlockDifference] = useState<number | null>(null);
  const [timeDifference, setTimeDifference] = useState<string>('');
  const [estimatedBlock, setEstimatedBlock] = useState<number | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<string>('');

  // Combine chain and block errors
  const combinedError = chainsError || error;

  // Ignore responses from a previously selected chain.
  const latestRequest = useRef(0);

  const fetchCurrentBlock = useCallback(async (chain: Chain | undefined) => {
    const requestId = ++latestRequest.current;
    setLoading(true);
    setError(null);

    try {
      if (!chain) {
        throw new Error('No REST endpoint found for selected chain');
      }

      const blocks = await fetchRecentBlocks(chain);
      if (requestId !== latestRequest.current) return;
      if (blocks.length === 0) {
        throw new Error('Failed to fetch latest block');
      }

      setCurrentBlock(blocks[blocks.length - 1]);
      setCalculatedBlockTime(calculateMedianBlockTime(blocks));
    } catch (e: unknown) {
      if (requestId !== latestRequest.current) return;
      console.error('Failed to fetch current block:', e);
      const errorMessage = e instanceof Error ? e.message : 'Failed to fetch current block';
      setError(errorMessage);
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, []);

  const calculateBlockDifference = () => {
    const from = parseInt(fromBlock);
    const to = parseInt(toBlock);

    if (isNaN(from) || isNaN(to)) {
      setError('Please enter valid block numbers');
      return;
    }

    if (to <= from) {
      setError('To block must be greater than from block');
      return;
    }

    if (!calculatedBlockTime) {
      setError('Block time not calculated yet. Please refresh current block data.');
      return;
    }

    const difference = to - from;
    const timeInSeconds = difference * calculatedBlockTime;

    setBlockDifference(difference);
    setTimeDifference(formatDuration(timeInSeconds));
    setError(null);
  };

  const calculateEstimatedBlock = () => {
    if (!currentBlock) {
      setError('Please fetch current block first');
      return;
    }

    if (!calculatedBlockTime) {
      setError('Block time not calculated yet. Please refresh current block data.');
      return;
    }

    const days = parseInt(timeDays) || 0;
    const hours = parseInt(timeHours) || 0;
    const minutes = parseInt(timeMinutes) || 0;
    const seconds = parseInt(timeSeconds) || 0;

    if (days === 0 && hours === 0 && minutes === 0 && seconds === 0) {
      setError('Please enter at least one time value (days, hours, minutes, or seconds)');
      return;
    }

    if (days < 0 || hours < 0 || minutes < 0 || seconds < 0) {
      setError('Time values cannot be negative');
      return;
    }

    if (hours > 23 || minutes > 59 || seconds > 59) {
      setError('Hours must be 0-23, minutes must be 0-59, and seconds must be 0-59');
      return;
    }

    // Convert all time to seconds
    const secondsToAdd = days * 86400 + hours * 3600 + minutes * 60 + seconds;

    const blocksToAdd = Math.round(secondsToAdd / calculatedBlockTime);
    const estimatedBlockNumber = currentBlock.height + blocksToAdd;

    const currentTime = new Date(currentBlock.timestamp);
    const futureTime = new Date(currentTime.getTime() + secondsToAdd * 1000);

    setEstimatedBlock(estimatedBlockNumber);
    setEstimatedTime(futureTime.toISOString());
    setError(null);
  };

  const calculateTimeToTarget = () => {
    if (!currentBlock) {
      setError('Please fetch current block first');
      return;
    }

    const target = parseInt(targetTime);
    if (isNaN(target)) {
      setError('Please enter a valid target block number');
      return;
    }

    if (target <= currentBlock.height) {
      setError('Target block must be greater than current block');
      return;
    }

    if (!calculatedBlockTime) {
      setError('Block time not calculated yet. Please refresh current block data.');
      return;
    }

    const blocksRemaining = target - currentBlock.height;
    const secondsRemaining = blocksRemaining * calculatedBlockTime;

    const currentTime = new Date(currentBlock.timestamp);
    const targetBlockTime = new Date(currentTime.getTime() + secondsRemaining * 1000);

    setEstimatedTime(targetBlockTime.toISOString());
    setTimeDifference(formatDuration(secondsRemaining));
    setError(null);
  };

  const formatDuration = (seconds: number): string => {
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (remainingSeconds > 0 || parts.length === 0) parts.push(`${remainingSeconds}s`);

    return parts.join(' ');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const resetCalculations = () => {
    setFromBlock('');
    setToBlock('');
    setTargetTime('');
    setTimeDays('');
    setTimeHours('');
    setTimeMinutes('');
    setTimeSeconds('');
    setBlockDifference(null);
    setTimeDifference('');
    setEstimatedBlock(null);
    setEstimatedTime('');
    setError(null);
  };

  useEffect(() => {
    if (selectedChainData) {
      // Show the loading state immediately when the selected chain changes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchCurrentBlock(selectedChainData);
    }
  }, [selectedChainData, fetchCurrentBlock]);

  return (
    <div className="container mx-auto py-6 sm:py-8 px-4 max-w-5xl">
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold tracking-tight mb-2 sm:mb-4">
            Block Time Calculator
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm lg:text-base max-w-2xl mx-auto px-2">
            Calculate block times, estimate future blocks, and analyze blockchain timing
          </p>
        </div>

        {/* Chain Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
              Chain Selection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-3 block">Select Chain</label>
                <ChainSelector
                  chains={chains}
                  selectedChain={selectedChain}
                  onChainChange={setSelectedChain}
                  loading={chainsLoading}
                  placeholder="Select a chain"
                />
              </div>
              <div className="flex gap-4">
                <Button
                  onClick={() => fetchCurrentBlock(selectedChainData)}
                  disabled={loading}
                  variant="rectangular"
                  className="flex-1 h-12 text-base sm:text-sm sm:h-10"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Fetch Current Block Data</span>
                  <span className="sm:hidden">Fetch Block Data</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Block Information */}
        {selectedChain && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Block Information</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm">Loading block data...</span>
                </div>
              ) : currentBlock ? (
                <div className="space-y-4 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0">
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      Block Height
                    </div>
                    <div className="text-xl sm:text-2xl font-bold">
                      {currentBlock.height.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground mt-2">
                      {formatDate(currentBlock.timestamp)}
                    </div>
                  </div>

                  {calculatedBlockTime && (
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="text-sm font-medium text-muted-foreground mb-2">
                        Block Time
                      </div>
                      <div className="text-xl sm:text-2xl font-bold">
                        {calculatedBlockTime.toFixed(2)}s
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Median of last 100 blocks
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <span className="text-sm">
                    No block data available. Please fetch current block data.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {combinedError && (
          <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <span className="text-sm">⚠️ {combinedError}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Calculators */}
        <div className="space-y-6">
          {/* Target Block Calculator */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Calculator className="h-4 w-4 sm:h-5 sm:w-5" />
                Time to Target Block
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Find when a specific block number will be reached
                </p>
                <div>
                  <label className="text-sm font-medium mb-3 block">Target Block Number</label>
                  <Input
                    type="number"
                    placeholder="e.g., 5000000"
                    value={targetTime}
                    onChange={(e) => setTargetTime(e.target.value)}
                    className="text-base sm:text-sm h-12 sm:h-10"
                  />
                </div>
                <Button
                  onClick={calculateTimeToTarget}
                  variant="rectangular"
                  className="w-full h-12 text-base sm:text-sm sm:h-10"
                >
                  Calculate Time to Target
                </Button>
                {estimatedTime && timeDifference && (
                  <div className="p-4 bg-muted rounded-lg space-y-4">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-2">
                        Time Remaining
                      </div>
                      <div className="text-lg sm:text-xl font-bold">{timeDifference}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-2">
                        Estimated Reach Time
                      </div>
                      <div className="text-sm sm:text-base font-medium">
                        {formatDate(estimatedTime)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Future Block Calculator */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Calculator className="h-4 w-4 sm:h-5 sm:w-5" />
                Future Block Estimator
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Estimate which block will be reached after a given time
                </p>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="text-sm font-medium mb-3 block">Days</label>
                      <Input
                        type="number"
                        placeholder="0"
                        min="0"
                        value={timeDays}
                        onChange={(e) => setTimeDays(e.target.value)}
                        className="text-base sm:text-sm h-12 sm:h-10"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-3 block">Hours</label>
                      <Input
                        type="number"
                        placeholder="0"
                        min="0"
                        max="23"
                        value={timeHours}
                        onChange={(e) => setTimeHours(e.target.value)}
                        className="text-base sm:text-sm h-12 sm:h-10"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="text-sm font-medium mb-3 block">Minutes</label>
                      <Input
                        type="number"
                        placeholder="0"
                        min="0"
                        max="59"
                        value={timeMinutes}
                        onChange={(e) => setTimeMinutes(e.target.value)}
                        className="text-base sm:text-sm h-12 sm:h-10"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-3 block">Seconds</label>
                      <Input
                        type="number"
                        placeholder="0"
                        min="0"
                        max="59"
                        value={timeSeconds}
                        onChange={(e) => setTimeSeconds(e.target.value)}
                        className="text-base sm:text-sm h-12 sm:h-10"
                      />
                    </div>
                  </div>
                </div>
                <Button
                  onClick={calculateEstimatedBlock}
                  variant="rectangular"
                  className="w-full h-12 text-base sm:text-sm sm:h-10"
                >
                  Calculate Future Block
                </Button>
                {estimatedBlock !== null && (
                  <div className="p-4 bg-muted rounded-lg space-y-4">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-2">
                        Estimated Block
                      </div>
                      <div className="text-lg sm:text-xl font-bold">
                        {estimatedBlock.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-2">
                        Estimated Time
                      </div>
                      <div className="text-sm sm:text-base font-medium">
                        {formatDate(estimatedTime)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Block Difference Calculator */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Calculator className="h-4 w-4 sm:h-5 sm:w-5" />
              Time Between Blocks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-xs sm:text-sm text-muted-foreground">
                Find the time difference between two block numbers
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-3 block">From Block</label>
                  <Input
                    type="number"
                    placeholder="e.g., 1000"
                    value={fromBlock}
                    onChange={(e) => setFromBlock(e.target.value)}
                    className="text-base sm:text-sm h-12 sm:h-10"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-3 block">To Block</label>
                  <Input
                    type="number"
                    placeholder="e.g., 2000"
                    value={toBlock}
                    onChange={(e) => setToBlock(e.target.value)}
                    className="text-base sm:text-sm h-12 sm:h-10"
                  />
                </div>
              </div>
              <Button
                onClick={calculateBlockDifference}
                variant="rectangular"
                className="w-full h-12 text-base sm:text-sm sm:h-10"
              >
                Calculate Time Between Blocks
              </Button>
              {blockDifference !== null && (
                <div className="p-4 bg-muted rounded-lg space-y-4 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      Block Difference
                    </div>
                    <div className="text-lg sm:text-xl font-bold">
                      {blockDifference.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">blocks</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      Time Difference
                    </div>
                    <div className="text-lg sm:text-xl font-bold">{timeDifference}</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Reset Button */}
        <div className="flex justify-center pt-2">
          <Button
            onClick={resetCalculations}
            variant="rectangular"
            className="px-8 h-12 text-base sm:text-sm sm:h-10 sm:px-6"
          >
            Reset All Calculations
          </Button>
        </div>
      </div>
    </div>
  );
}
