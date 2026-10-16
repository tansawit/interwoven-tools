'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useFetch } from '@/lib/hooks/useFetch';
import { convertEthToBech32, convertBech32ToEth } from '@/lib/address-utils';
import { Chain, useChains } from '@/lib/hooks/useChains';
import { ChainSelector } from '@/components/ChainSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  RefreshCw,
  Activity,
  Award,
  Database,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  BridgeInfo,
  getBridgeInfos,
  getEvmScores,
  getMoveScores,
  getVIPStatus,
  getWasmScores,
} from '@/lib/vip-scores';

interface VIPScoreEntry {
  address: string;
  score: string;
  rank: number;
}

const isRollup = (chain: Chain) =>
  chain.chain_name.toLowerCase() !== 'initia' && !!chain.metadata?.minitia?.type;

// Address conversion utilities
const bech32ToHex = (bech32Address: string): string | null => {
  try {
    if (!bech32Address.startsWith('init')) return null;
    return convertBech32ToEth(bech32Address);
  } catch {
    return null;
  }
};

const hexToBech32 = (hexAddress: string): string | null => {
  try {
    if (!hexAddress.startsWith('0x')) return null;
    return convertEthToBech32(hexAddress, 'init');
  } catch {
    return null;
  }
};

/** The same address in the other format (hex <-> bech32), lowercased. */
const alternateAddress = (address: string) =>
  (address.startsWith('0x') ? hexToBech32(address) : bech32ToHex(address))?.toLowerCase() ?? null;

async function fetchScores(chain: Chain, bridgeInfo: BridgeInfo, stage: number) {
  const contractAddr = bridgeInfo.vip_l2_score_contract;

  if (bridgeInfo.vm_type === '2') {
    const jsonRpcEndpoint = chain.apis?.['json-rpc']?.[0]?.address;
    if (!jsonRpcEndpoint) {
      throw new Error(`No JSON RPC endpoint found for chain: ${chain.chain_name}`);
    }
    return getEvmScores(jsonRpcEndpoint, contractAddr, stage);
  }

  const restEndpoint = chain.apis?.rest?.[0]?.address;
  if (!restEndpoint) {
    throw new Error('REST endpoint not found for selected chain');
  }
  return bridgeInfo.vm_type === '0'
    ? getMoveScores(restEndpoint, contractAddr, stage)
    : getWasmScores(restEndpoint, contractAddr, stage);
}

export default function VIPScores() {
  // Use shared chains hook
  const {
    chains,
    selectedChain,
    setSelectedChain,
    loading: chainsLoading,
    error: chainsError,
  } = useChains({ filter: isRollup, autoSelect: false });

  const {
    data: vipStatus,
    loading,
    error,
    lastUpdated,
    refresh: fetchVIPStatus,
  } = useFetch(getVIPStatus);
  const [vipScores, setVipScores] = useState<VIPScoreEntry[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scoresLoading, setScoresLoading] = useState<boolean>(false);
  const [searchAddress, setSearchAddress] = useState<string>('');

  // Bridge infos rarely change; fetch them once per visit.
  const bridgeInfosRequest = useRef<Promise<BridgeInfo[]> | null>(null);

  // Combine errors
  const combinedError = chainsError || error;

  const SCORES_PER_PAGE = 20;

  const selectedChainData = chains.find((c) => c.chain_name === selectedChain);

  useEffect(() => {
    if (!selectedChainData || !vipStatus) return;
    let cancelled = false;

    const loadScores = async () => {
      setScoresLoading(true);
      try {
        const bridgeId = selectedChainData.metadata?.op_bridge_id;
        if (!bridgeId) {
          throw new Error('Bridge ID not found for selected chain');
        }

        bridgeInfosRequest.current ??= getBridgeInfos().catch((e) => {
          bridgeInfosRequest.current = null;
          throw e;
        });
        const bridgeInfo = (await bridgeInfosRequest.current).find(
          (info) => info.bridge_id === bridgeId
        );
        if (!bridgeInfo) {
          throw new Error(`Bridge info not found for bridge ID: ${bridgeId}`);
        }

        const scoresData = await fetchScores(selectedChainData, bridgeInfo, vipStatus.stage);
        if (cancelled) return;

        // Sort by score (descending) and assign ranks
        const scoreEntries: VIPScoreEntry[] = Object.entries(scoresData)
          .sort(([, a], [, b]) => (b > a ? 1 : b < a ? -1 : 0))
          .map(([address, score], index) => ({
            address,
            score: score.toString(),
            rank: index + 1,
          }));

        setVipScores(scoreEntries);
        setCurrentPage(1);
      } catch (e: unknown) {
        if (cancelled) return;
        console.error('Failed to fetch VIP scores:', e);
        setVipScores([]);
      } finally {
        if (!cancelled) setScoresLoading(false);
      }
    };

    loadScores();
    return () => {
      cancelled = true;
    };
  }, [selectedChainData, vipStatus]);

  // Each address in both formats, computed once per score list rather than on every keystroke.
  const searchableScores = useMemo(
    () =>
      vipScores.map((entry) => ({
        entry,
        address: entry.address.toLowerCase(),
        alternate: alternateAddress(entry.address),
      })),
    [vipScores]
  );

  // Matches either address format against either search format
  const filteredScores = useMemo(() => {
    const searchTerm = searchAddress.toLowerCase();
    if (!searchTerm) return vipScores;

    const isFormattedSearch = searchTerm.startsWith('init') || searchTerm.startsWith('0x');
    const convertedSearchTerm = isFormattedSearch ? alternateAddress(searchAddress) : null;

    return searchableScores
      .filter(
        ({ address, alternate }) =>
          address.includes(searchTerm) ||
          (isFormattedSearch && !!alternate?.includes(searchTerm)) ||
          (!!convertedSearchTerm && address.includes(convertedSearchTerm))
      )
      .map(({ entry }) => entry);
  }, [searchAddress, searchableScores, vipScores]);

  const formatLargeNumber = (value: number) => {
    if (value >= 1e9) {
      return (value / 1e9).toFixed(1) + 'B';
    }
    if (value >= 1e6) {
      return (value / 1e6).toFixed(1) + 'M';
    }
    if (value >= 1e3) {
      return (value / 1e3).toFixed(1) + 'K';
    }
    return value.toFixed(0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const calculateProgress = () => {
    if (!vipStatus) return 0;

    const start = new Date(vipStatus.start_time).getTime();
    const end = new Date(vipStatus.end_time).getTime();
    const now = lastUpdated?.getTime() ?? start;

    if (now < start) return 0;
    if (now > end) return 100;

    return ((now - start) / (end - start)) * 100;
  };

  return (
    <div className="container mx-auto py-6 sm:py-8 px-4 max-w-7xl">
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold tracking-tight mb-2 sm:mb-4">
            VIP Scores
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm lg:text-base max-w-2xl mx-auto px-2">
            Track and monitor VIP scores across the Interwoven ecosystem
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>
              {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : 'Never updated'}
            </span>
          </div>
          <Button
            onClick={fetchVIPStatus}
            disabled={loading}
            size="sm"
            variant="outline"
            className="w-fit text-xs sm:text-sm"
          >
            <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Error State */}
        {combinedError && (
          <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <span className="text-xs sm:text-sm">⚠️ Error: {combinedError}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        {loading ? (
          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-center justify-center py-6 sm:py-8">
                <RefreshCw className="h-5 w-5 sm:h-6 sm:w-6 animate-spin mr-2" />
                <span className="text-xs sm:text-sm">Loading VIP status...</span>
              </div>
            </CardContent>
          </Card>
        ) : vipStatus ? (
          <div className="grid gap-6">
            {/* Current Vesting Stage & Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg lg:text-xl flex items-center gap-2">
                  <Award className="h-4 w-4 sm:h-5 sm:w-5" />
                  Current Vesting Stage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 sm:space-y-6">
                  {/* Stage Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Stage</p>
                      <p className="text-xl sm:text-2xl font-bold">{vipStatus.stage}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Total Reward</p>
                      <p className="text-xl sm:text-2xl font-bold">
                        {formatLargeNumber(vipStatus.total_reward / 1e6)}
                      </p>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="space-y-3 sm:space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground">Start Time</p>
                        <p className="font-medium text-xs sm:text-sm break-all">
                          {formatDate(vipStatus.start_time)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground">End Time</p>
                        <p className="font-medium text-xs sm:text-sm break-all">
                          {formatDate(vipStatus.end_time)}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-xs sm:text-sm text-muted-foreground mb-2">
                        <span>Progress</span>
                        <span>{calculateProgress().toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${calculateProgress()}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* VIP Scores */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg lg:text-xl flex items-center gap-2">
                  <Database className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="truncate">
                    {selectedChain
                      ? `VIP Scores - ${
                          chains.find((c) => c.chain_name === selectedChain)?.pretty_name ||
                          selectedChain
                        }`
                      : 'VIP Scores'}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
                      Select a chain to view current VIP scores for this stage
                    </p>
                    <ChainSelector
                      chains={chains}
                      selectedChain={selectedChain}
                      onChainChange={setSelectedChain}
                      loading={chainsLoading}
                      placeholder="Select a chain"
                    />
                  </div>

                  {selectedChain && (
                    <>
                      {scoresLoading ? (
                        <div className="flex items-center justify-center py-6 sm:py-8">
                          <RefreshCw className="h-5 w-5 sm:h-6 sm:w-6 animate-spin mr-2" />
                          <span className="text-xs sm:text-sm">Loading VIP scores...</span>
                        </div>
                      ) : vipScores.length > 0 ? (
                        <div className="space-y-3 sm:space-y-4">
                          {/* Search Input */}
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground pointer-events-none" />
                            <Input
                              placeholder="Search by address..."
                              value={searchAddress}
                              onChange={(e) => {
                                setSearchAddress(e.target.value);
                                setCurrentPage(1);
                              }}
                              className="pl-8 sm:pl-10 text-xs sm:text-sm"
                            />
                          </div>

                          {filteredScores.length > 0 ? (
                            <>
                              {/* Mobile Cards View */}
                              <div className="block sm:hidden space-y-2">
                                {filteredScores
                                  .slice(
                                    (currentPage - 1) * SCORES_PER_PAGE,
                                    currentPage * SCORES_PER_PAGE
                                  )
                                  .map((entry) => (
                                    <Card key={entry.address} className="p-3">
                                      <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                          <span className="text-xs font-medium text-muted-foreground">
                                            Rank #{entry.rank}
                                          </span>
                                          <span className="text-sm font-bold">
                                            {parseInt(entry.score).toLocaleString()}
                                          </span>
                                        </div>
                                        <div className="text-xs font-mono break-all leading-relaxed">
                                          {entry.address}
                                        </div>
                                      </div>
                                    </Card>
                                  ))}
                              </div>

                              {/* Desktop Table View */}
                              <div className="hidden sm:block overflow-x-auto">
                                <table className="w-full border-collapse">
                                  <thead>
                                    <tr className="border-b">
                                      <th className="text-left py-2 px-3 sm:px-4 font-medium w-16 sm:w-20 text-xs sm:text-sm">
                                        Rank
                                      </th>
                                      <th className="text-left py-2 px-3 sm:px-4 font-medium text-xs sm:text-sm">
                                        Address
                                      </th>
                                      <th className="text-right py-2 px-3 sm:px-4 font-medium w-24 sm:w-32 text-xs sm:text-sm">
                                        Score
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {filteredScores
                                      .slice(
                                        (currentPage - 1) * SCORES_PER_PAGE,
                                        currentPage * SCORES_PER_PAGE
                                      )
                                      .map((entry) => (
                                        <tr
                                          key={entry.address}
                                          className="border-b hover:bg-gray-800"
                                        >
                                          <td className="py-2 px-3 sm:px-4 text-xs sm:text-sm w-16 sm:w-20">
                                            {entry.rank}
                                          </td>
                                          <td className="py-2 px-3 sm:px-4 text-xs sm:text-sm font-mono break-all">
                                            {entry.address}
                                          </td>
                                          <td className="py-2 px-3 sm:px-4 text-xs sm:text-sm text-right font-bold w-24 sm:w-32">
                                            {parseInt(entry.score).toLocaleString()}
                                          </td>
                                        </tr>
                                      ))}
                                  </tbody>
                                </table>
                              </div>

                              {/* Pagination */}
                              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 sm:pt-4">
                                <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                                  Showing {(currentPage - 1) * SCORES_PER_PAGE + 1} to{' '}
                                  {Math.min(currentPage * SCORES_PER_PAGE, filteredScores.length)}{' '}
                                  of {filteredScores.length} entries
                                  {searchAddress && (
                                    <span className="block sm:inline">
                                      {' '}
                                      (filtered from {vipScores.length} total)
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="text-xs"
                                  >
                                    <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                                    <span className="hidden sm:inline">Previous</span>
                                    <span className="sm:hidden">Prev</span>
                                  </Button>

                                  <span className="px-2 sm:px-3 py-1 text-xs sm:text-sm">
                                    {currentPage} of{' '}
                                    {Math.ceil(filteredScores.length / SCORES_PER_PAGE)}
                                  </span>

                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      setCurrentPage((prev) =>
                                        Math.min(
                                          Math.ceil(filteredScores.length / SCORES_PER_PAGE),
                                          prev + 1
                                        )
                                      )
                                    }
                                    disabled={
                                      currentPage ===
                                      Math.ceil(filteredScores.length / SCORES_PER_PAGE)
                                    }
                                    className="text-xs"
                                  >
                                    <span className="hidden sm:inline">Next</span>
                                    <span className="sm:hidden">Next</span>
                                    <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                                  </Button>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="text-center py-6 sm:py-8 text-muted-foreground">
                              <p className="text-xs sm:text-sm">
                                No addresses found matching &quot;{searchAddress}&quot;.
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-6 sm:py-8 text-muted-foreground">
                          <p className="text-xs sm:text-sm">No VIP scores found for this chain.</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}
