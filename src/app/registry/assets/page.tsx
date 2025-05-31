'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { diffWords } from 'diff';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';

interface Asset {
  description: string;
  denom_units: {
    denom: string;
    exponent: number;
    aliases: string[];
  }[];
  type_asset: string;
  address: string;
  base: string;
  name: string;
  display: string;
  symbol: string;
  logo_URIs: {
    png: string;
  };
  coingecko_id: string;
  keywords: string[];
}

interface Chain {
  chain_name: string;
  pretty_name: string;
  logo_URIs: {
    png: string;
  };
}

interface AssetList {
  chain_name: string;
  assets: Asset[];
}

interface DiffPart {
  value: string;
  added?: boolean;
  removed?: boolean;
}

export default function AssetRegistryPage() {
  const [chains, setChains] = useState<Chain[]>([]);
  const [selectedChain, setSelectedChain] = useState<string>('');
  const [currentAssetList, setCurrentAssetList] = useState<AssetList | null>(null);
  const [formData, setFormData] = useState<{
    chain_name: string;
    asset: Asset;
  }>({
    chain_name: '',
    asset: {
      description: '',
      denom_units: [{ denom: '', exponent: 0, aliases: [] }],
      type_asset: 'sdk.coin',
      address: '',
      base: '',
      name: '',
      display: '',
      symbol: '',
      logo_URIs: { png: '' },
      coingecko_id: '',
      keywords: [],
    },
  });

  const [currentKeyword, setCurrentKeyword] = useState('');
  const [currentAlias, setCurrentAlias] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchChains = async () => {
      try {
        const response = await fetch('https://registry.testnet.initia.xyz/chains.json');
        const data = await response.json();
        setChains(data);
      } catch (error) {
        console.error('Error fetching chains:', error);
      }
    };
    fetchChains();
  }, []);

  useEffect(() => {
    const fetchAssetList = async () => {
      if (!selectedChain) return;
      try {
        const response = await fetch(
          `https://registry.testnet.initia.xyz/chains/${selectedChain}/assetlist.json`
        );
        const data = await response.json();
        setCurrentAssetList(data);
        setFormData((prev) => ({ ...prev, chain_name: selectedChain }));
      } catch (error) {
        console.error('Error fetching asset list:', error);
      }
    };
    fetchAssetList();
  }, [selectedChain]);

  const handleChainSelect = (chainName: string) => {
    setSelectedChain(chainName);
  };

  const generateDiff = () => {
    if (!currentAssetList || !formData.asset) return null;

    const currentJson = JSON.stringify(currentAssetList, null, 2);
    const newAssetList = {
      ...currentAssetList,
      assets: [...currentAssetList.assets, formData.asset],
    };
    const newJson = JSON.stringify(newAssetList, null, 2);

    return diffWords(currentJson, newJson) as DiffPart[];
  };

  const scrollRef = React.useRef<HTMLDivElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...(formData[parent as keyof typeof formData] as unknown as Record<string, unknown>),
          [child]: value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }

    // Scroll to added content after form changes
    setTimeout(() => {
      if (scrollRef.current) {
        const addedContent = scrollRef.current.querySelector(
          '.bg-green-100, .dark\\:bg-green-900\\/50'
        );
        if (addedContent) {
          addedContent.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }, 100);
  };

  const handleDenomUnitChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const { name, value } = e.target;
    const updatedDenomUnits = [...formData.asset.denom_units];

    if (name === `denom_units[${index}].exponent`) {
      // Handle empty input specially to allow deleting the 0
      let exponentValue: number;
      if (value === '') {
        exponentValue = 0;
      } else {
        exponentValue = parseInt(value) || 0;
      }

      updatedDenomUnits[index] = {
        ...updatedDenomUnits[index],
        exponent: exponentValue,
      };
    } else if (name === `denom_units[${index}].denom`) {
      updatedDenomUnits[index] = {
        ...updatedDenomUnits[index],
        denom: value,
      };
    }

    // Automatically update base and display denoms
    let newBase = formData.asset.base;
    let newDisplay = formData.asset.display;

    // Find denom with exponent 0 for base denom
    const zeroDenom = updatedDenomUnits.find((unit) => unit.denom && unit.exponent === 0);
    if (zeroDenom) {
      newBase = zeroDenom.denom;
    }

    // Find denom with highest exponent for display denom (that is not 0)
    let highestExponent = -1;
    updatedDenomUnits.forEach((unit) => {
      // Only consider denoms that are not empty and don't have 0 exponent
      if (unit.denom && unit.exponent > highestExponent && unit.exponent > 0) {
        highestExponent = unit.exponent;
        newDisplay = unit.denom;
      }
    });

    setFormData({
      ...formData,
      asset: {
        ...formData.asset,
        denom_units: updatedDenomUnits,
        base: newBase,
        display: newDisplay,
      },
    });

    // Scroll to added content after form changes
    setTimeout(() => {
      if (scrollRef.current) {
        const addedContent = scrollRef.current.querySelector(
          '.bg-green-100, .dark\\:bg-green-900\\/50'
        );
        if (addedContent) {
          addedContent.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }, 100);
  };

  const addDenomUnit = () => {
    const updatedDenomUnits = [
      ...formData.asset.denom_units,
      { denom: '', exponent: 0, aliases: [] },
    ];

    // Automatically update base and display denoms
    let newBase = formData.asset.base;
    let newDisplay = formData.asset.display;

    // Find denom with exponent 0 for base denom
    const zeroDenom = updatedDenomUnits.find((unit) => unit.denom && unit.exponent === 0);
    if (zeroDenom) {
      newBase = zeroDenom.denom;
    }

    // Find denom with highest exponent for display denom (that is not 0)
    let highestExponent = -1;
    updatedDenomUnits.forEach((unit) => {
      // Only consider denoms that are not empty and don't have 0 exponent
      if (unit.denom && unit.exponent > highestExponent && unit.exponent > 0) {
        highestExponent = unit.exponent;
        newDisplay = unit.denom;
      }
    });

    setFormData({
      ...formData,
      asset: {
        ...formData.asset,
        denom_units: updatedDenomUnits,
        base: newBase,
        display: newDisplay,
      },
    });
  };

  const removeDenomUnit = (index: number) => {
    if (formData.asset.denom_units.length > 1) {
      const updatedDenomUnits = [...formData.asset.denom_units];
      updatedDenomUnits.splice(index, 1);

      // Automatically update base and display denoms
      let newBase = formData.asset.base;
      let newDisplay = formData.asset.display;

      // Find denom with exponent 0 for base denom
      const zeroDenom = updatedDenomUnits.find((unit) => unit.denom && unit.exponent === 0);
      if (zeroDenom) {
        newBase = zeroDenom.denom;
      } else {
        // If no zero exponent exists anymore, reset base
        newBase = '';
      }

      // Find denom with highest exponent for display denom (that is not 0)
      let highestExponent = -1;
      updatedDenomUnits.forEach((unit) => {
        // Only consider denoms that are not empty and don't have 0 exponent
        if (unit.denom && unit.exponent > highestExponent && unit.exponent > 0) {
          highestExponent = unit.exponent;
          newDisplay = unit.denom;
        }
      });

      // If no denoms left with exponents, reset display
      if (highestExponent === -1) {
        newDisplay = '';
      }

      setFormData({
        ...formData,
        asset: {
          ...formData.asset,
          denom_units: updatedDenomUnits,
          base: newBase,
          display: newDisplay,
        },
      });
    }
  };

  const addKeyword = () => {
    if (currentKeyword.trim() !== '') {
      setFormData({
        ...formData,
        asset: {
          ...formData.asset,
          keywords: [...formData.asset.keywords, currentKeyword.trim()],
        },
      });
      setCurrentKeyword('');
    }
  };

  const removeKeyword = (index: number) => {
    const updatedKeywords = [...formData.asset.keywords];
    updatedKeywords.splice(index, 1);

    setFormData({
      ...formData,
      asset: {
        ...formData.asset,
        keywords: updatedKeywords,
      },
    });
  };

  const addAlias = (denomUnitIndex: number) => {
    if (currentAlias.trim() !== '') {
      const updatedDenomUnits = [...formData.asset.denom_units];
      updatedDenomUnits[denomUnitIndex] = {
        ...updatedDenomUnits[denomUnitIndex],
        aliases: [...updatedDenomUnits[denomUnitIndex].aliases, currentAlias.trim()],
      };

      setFormData({
        ...formData,
        asset: {
          ...formData.asset,
          denom_units: updatedDenomUnits,
        },
      });
      setCurrentAlias('');
    }
  };

  const removeAlias = (denomUnitIndex: number, aliasIndex: number) => {
    const updatedDenomUnits = [...formData.asset.denom_units];
    const updatedAliases = [...(updatedDenomUnits[denomUnitIndex].aliases || [])];
    updatedAliases.splice(aliasIndex, 1);

    updatedDenomUnits[denomUnitIndex] = {
      ...updatedDenomUnits[denomUnitIndex],
      aliases: updatedAliases,
    };

    setFormData({
      ...formData,
      asset: {
        ...formData.asset,
        denom_units: updatedDenomUnits,
      },
    });
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    // Required fields validation
    if (!formData.chain_name) errors.chain_name = 'Chain name is required';
    if (!formData.asset.base) errors.base = 'Base denom is required';
    if (!formData.asset.display) errors.display = 'Display denom is required';
    if (!formData.asset.name) errors.name = 'Name is required';
    if (!formData.asset.symbol) errors.symbol = 'Symbol is required';

    // Denom units validation
    if (formData.asset.denom_units.length === 0) {
      errors.denom_units = 'At least one denom unit is required';
    } else {
      formData.asset.denom_units.forEach((unit, index) => {
        if (!unit.denom) errors[`denom_units[${index}].denom`] = 'Denom is required';
      });
    }

    // Type-specific validation
    if (
      ['erc20', 'cw20', 'snip20'].includes(formData.asset.type_asset) &&
      !formData.asset.address
    ) {
      errors.address = 'Address is required for this asset type';
    }

    // Base and display must be in denom_units
    const denomNames = formData.asset.denom_units.map((unit) => unit.denom);
    if (!denomNames.includes(formData.asset.base)) {
      errors.base = 'Base denom must be included in denom units';
    }
    if (!denomNames.includes(formData.asset.display)) {
      errors.display = 'Display denom must be included in denom units';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      // Format the data according to assetlist.json schema
      const assetlistEntry = {
        chain_name: formData.chain_name,
        assets: [formData.asset],
      };

      // In a real application, you would send this data to a server
      console.log('Asset entry to add:', JSON.stringify(assetlistEntry, null, 2));
    }
  };

  return (
    <div className="container mx-auto py-4 sm:py-6 px-4 max-w-7xl">
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Asset Registry</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Add a new entry to a rollup&apos;s assetlist.json based on the Initia Registry schema.
            </p>
          </div>

          <div className="w-full lg:w-1/3">
            <Select onValueChange={handleChainSelect} value={selectedChain}>
              <SelectTrigger className="w-full bg-black">
                <SelectValue placeholder="Select a chain" />
              </SelectTrigger>
              <SelectContent className="bg-black border border-border">
                {chains.map((chain) => (
                  <SelectItem
                    key={chain.chain_name}
                    value={chain.chain_name}
                    className="flex items-center gap-2 py-2"
                  >
                    {chain.logo_URIs?.png && (
                      <div className="relative w-4 h-4 sm:w-5 sm:h-5 shrink-0">
                        <Image
                          src={chain.logo_URIs.png}
                          alt={chain.chain_name}
                          width={20}
                          height={20}
                          className="rounded-full"
                        />
                      </div>
                    )}
                    <span className="text-sm">{chain.pretty_name || chain.chain_name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedChain && (
          <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4 lg:gap-6">
            {/* JSON Preview - Shows first on mobile */}
            <div className="order-2 lg:order-1">
              <Card className="h-[300px] sm:h-[400px] lg:h-[36rem] flex flex-col">
                <CardHeader className="py-2 px-4">
                  <CardTitle className="text-base sm:text-lg">Asset List Preview</CardTitle>
                  <CardDescription className="text-xs">
                    {currentAssetList
                      ? 'Preview changes to the asset list'
                      : 'Loading asset list...'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-2">
                  <ScrollArea ref={scrollRef} className="h-full w-full rounded-md border p-2">
                    <pre className="text-xs overflow-x-auto">
                      {currentAssetList &&
                        generateDiff()?.map((part: DiffPart, index: number) => (
                          <span
                            key={index}
                            className={
                              part.added
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                                : part.removed
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                                : ''
                            }
                          >
                            {part.value}
                          </span>
                        ))}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Form - Shows second on mobile */}
            <div className="order-1 lg:order-2">
              <form onSubmit={handleSubmit} className="space-y-3">
                <Card className="h-[500px] sm:h-[600px] lg:h-[36rem] overflow-auto">
                  <CardHeader className="py-2 px-4">
                    <CardTitle className="text-base sm:text-lg">New Asset Information</CardTitle>
                    <CardDescription className="text-xs">
                      Enter the details for the new asset.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 overflow-y-auto">
                    <Tabs defaultValue="basic" className="w-full">
                      <TabsList className="grid w-full grid-cols-3 bg-zinc-900 rounded-md p-1 text-xs sm:text-sm">
                        <TabsTrigger
                          value="basic"
                          className="transition-all hover:bg-zinc-800 data-[state=active]:bg-zinc-600 data-[state=active]:text-white rounded-md text-xs sm:text-sm"
                        >
                          Basic
                        </TabsTrigger>
                        <TabsTrigger
                          value="denom"
                          className="transition-all hover:bg-zinc-800 data-[state=active]:bg-zinc-600 data-[state=active]:text-white rounded-md text-xs sm:text-sm"
                        >
                          Denoms
                        </TabsTrigger>
                        <TabsTrigger
                          value="metadata"
                          className="transition-all hover:bg-zinc-800 data-[state=active]:bg-zinc-600 data-[state=active]:text-white rounded-md text-xs sm:text-sm"
                        >
                          Meta
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="basic">
                        <div className="space-y-3 pt-3">
                          <div>
                            <label htmlFor="asset.name" className="block text-xs font-medium mb-1">
                              Name<span className="text-red-500">*</span>
                            </label>
                            <Input
                              id="asset.name"
                              name="asset.name"
                              value={formData.asset.name}
                              onChange={handleChange}
                              placeholder="e.g., Bitcoin"
                              className={`h-8 text-xs sm:text-sm ${
                                formErrors.name ? 'border-red-500' : ''
                              }`}
                            />
                            {formErrors.name && (
                              <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
                            )}
                          </div>

                          <div>
                            <label
                              htmlFor="asset.symbol"
                              className="block text-xs font-medium mb-1"
                            >
                              Symbol<span className="text-red-500">*</span>
                            </label>
                            <Input
                              id="asset.symbol"
                              name="asset.symbol"
                              value={formData.asset.symbol}
                              onChange={handleChange}
                              placeholder="e.g., BTC"
                              className={`h-8 text-xs sm:text-sm ${
                                formErrors.symbol ? 'border-red-500' : ''
                              }`}
                            />
                            {formErrors.symbol && (
                              <p className="text-red-500 text-xs mt-1">{formErrors.symbol}</p>
                            )}
                          </div>

                          <div>
                            <label
                              htmlFor="asset.description"
                              className="block text-xs font-medium mb-1"
                            >
                              Description
                            </label>
                            <Input
                              id="asset.description"
                              name="asset.description"
                              value={formData.asset.description}
                              onChange={handleChange}
                              placeholder="A short description of the asset"
                              className="h-8 text-xs sm:text-sm"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor="asset.type_asset"
                              className="block text-xs font-medium mb-1"
                            >
                              Asset Type<span className="text-red-500">*</span>
                            </label>
                            <Select
                              value={formData.asset.type_asset}
                              onValueChange={(value) =>
                                setFormData({
                                  ...formData,
                                  asset: { ...formData.asset, type_asset: value },
                                })
                              }
                            >
                              <SelectTrigger
                                className={`h-8 text-xs sm:text-sm ${
                                  formErrors.type_asset ? 'border-red-500' : ''
                                }`}
                              >
                                <SelectValue placeholder="Select asset type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="sdk.coin">SDK Coin</SelectItem>
                                <SelectItem value="cw20">CW20</SelectItem>
                                <SelectItem value="erc20">ERC20</SelectItem>
                                <SelectItem value="snip20">SNIP20</SelectItem>
                              </SelectContent>
                            </Select>
                            {formErrors.type_asset && (
                              <p className="text-red-500 text-xs mt-1">{formErrors.type_asset}</p>
                            )}
                          </div>

                          {['erc20', 'cw20', 'snip20'].includes(formData.asset.type_asset) && (
                            <div>
                              <label
                                htmlFor="asset.address"
                                className="block text-xs font-medium mb-1"
                              >
                                Contract Address<span className="text-red-500">*</span>
                              </label>
                              <Input
                                id="asset.address"
                                name="asset.address"
                                value={formData.asset.address}
                                onChange={handleChange}
                                placeholder="Contract address"
                                className={`h-8 text-xs sm:text-sm ${
                                  formErrors.address ? 'border-red-500' : ''
                                }`}
                              />
                              {formErrors.address && (
                                <p className="text-red-500 text-xs mt-1">{formErrors.address}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="denom">
                        <div className="space-y-3 pt-3">
                          <div className="mb-3">
                            <h3 className="text-sm sm:text-base font-semibold">
                              Denomination Units
                            </h3>
                            <p className="text-muted-foreground text-xs">
                              Add different denominations for the asset with their respective
                              exponents.
                            </p>
                          </div>

                          {formData.asset.denom_units.map((unit, index) => (
                            <div key={index} className="border border-border rounded p-3 space-y-3">
                              <div className="flex justify-between items-center">
                                <h4 className="text-xs sm:text-sm font-medium">
                                  Denom Unit {index + 1}
                                </h4>
                                {formData.asset.denom_units.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => removeDenomUnit(index)}
                                    className="h-6 text-xs"
                                  >
                                    Remove
                                  </Button>
                                )}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label
                                    htmlFor={`denom_units[${index}].denom`}
                                    className="block text-xs font-medium mb-1"
                                  >
                                    Denom<span className="text-red-500">*</span>
                                  </label>
                                  <Input
                                    id={`denom_units[${index}].denom`}
                                    name={`denom_units[${index}].denom`}
                                    value={unit.denom}
                                    onChange={(e) => handleDenomUnitChange(e, index)}
                                    placeholder="e.g., uatom, satoshi"
                                    className={`h-8 text-xs sm:text-sm ${
                                      formErrors[`denom_units[${index}].denom`]
                                        ? 'border-red-500'
                                        : ''
                                    }`}
                                  />
                                  {formErrors[`denom_units[${index}].denom`] && (
                                    <p className="text-red-500 text-xs mt-1">
                                      {formErrors[`denom_units[${index}].denom`]}
                                    </p>
                                  )}
                                </div>

                                <div>
                                  <label
                                    htmlFor={`denom_units[${index}].exponent`}
                                    className="block text-xs font-medium mb-1"
                                  >
                                    Exponent<span className="text-red-500">*</span>
                                  </label>
                                  <Input
                                    id={`denom_units[${index}].exponent`}
                                    name={`denom_units[${index}].exponent`}
                                    type="number"
                                    value={unit.exponent}
                                    onChange={(e) => handleDenomUnitChange(e, index)}
                                    onFocus={(e) => {
                                      if (e.target.value === '0') {
                                        e.target.value = '';
                                      }
                                    }}
                                    onBlur={(e) => {
                                      if (e.target.value === '') {
                                        e.target.value = '0';
                                      }
                                    }}
                                    min="0"
                                    className="h-8 text-xs sm:text-sm"
                                    placeholder="0"
                                  />
                                </div>
                              </div>

                              <div className="space-y-2">
                                <label className="block text-xs font-medium mb-1">Aliases</label>
                                {unit.aliases && unit.aliases.length > 0 && (
                                  <div className="flex flex-wrap gap-1 sm:gap-2 mb-2">
                                    {unit.aliases.map((alias, aliasIndex) => (
                                      <div
                                        key={aliasIndex}
                                        className="flex items-center bg-secondary px-2 py-1 rounded-md text-xs"
                                      >
                                        <span>{alias}</span>
                                        <button
                                          type="button"
                                          onClick={() => removeAlias(index, aliasIndex)}
                                          className="ml-1 text-red-500"
                                        >
                                          ×
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <Input
                                    value={currentAlias}
                                    onChange={(e) => setCurrentAlias(e.target.value)}
                                    placeholder="Add alias"
                                    className="h-8 text-xs sm:text-sm"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addAlias(index);
                                      }
                                    }}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => addAlias(index)}
                                    className="h-8 text-xs"
                                  >
                                    Add
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}

                          <Button
                            type="button"
                            variant="outline"
                            onClick={addDenomUnit}
                            className="w-full h-8 text-xs sm:text-sm"
                          >
                            Add Denom Unit
                          </Button>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                            <div>
                              <label
                                htmlFor="asset.base"
                                className="block text-xs font-medium mb-1"
                              >
                                Base Denom<span className="text-red-500">*</span>
                              </label>
                              <Input
                                id="asset.base"
                                name="asset.base"
                                value={formData.asset.base}
                                readOnly
                                placeholder=""
                                className={`h-8 text-xs sm:text-sm ${
                                  formErrors.base ? 'border-red-500' : ''
                                } bg-zinc-800 text-white`}
                              />
                              {formErrors.base && (
                                <p className="text-red-500 text-xs mt-1">{formErrors.base}</p>
                              )}
                            </div>

                            <div>
                              <label
                                htmlFor="asset.display"
                                className="block text-xs font-medium mb-1"
                              >
                                Display Denom<span className="text-red-500">*</span>
                              </label>
                              <Input
                                id="asset.display"
                                name="asset.display"
                                value={formData.asset.display}
                                readOnly
                                placeholder=""
                                className={`h-8 text-xs sm:text-sm ${
                                  formErrors.display ? 'border-red-500' : ''
                                } bg-zinc-800 text-white`}
                              />
                              {formErrors.display && (
                                <p className="text-red-500 text-xs mt-1">{formErrors.display}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="metadata">
                        <div className="space-y-3 pt-3">
                          <div className="mb-3">
                            <h3 className="text-sm sm:text-base font-semibold">
                              Additional Metadata
                            </h3>
                            <p className="text-muted-foreground text-xs">
                              Provide additional information about the asset.
                            </p>
                          </div>
                          <div>
                            <label
                              htmlFor="asset.logo_URIs.png"
                              className="block text-xs font-medium mb-1"
                            >
                              Logo URL (PNG)
                            </label>
                            <Input
                              id="asset.logo_URIs.png"
                              name="asset.logo_URIs.png"
                              value={formData.asset.logo_URIs.png}
                              onChange={(e) => {
                                setFormData({
                                  ...formData,
                                  asset: {
                                    ...formData.asset,
                                    logo_URIs: {
                                      ...formData.asset.logo_URIs,
                                      png: e.target.value,
                                    },
                                  },
                                });
                              }}
                              placeholder="https://example.com/logo.png"
                              className="h-8 text-xs sm:text-sm"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Must be a HTTPS URL ending with .png
                            </p>
                          </div>

                          <div>
                            <label
                              htmlFor="asset.coingecko_id"
                              className="block text-xs font-medium mb-1"
                            >
                              Coingecko ID
                            </label>
                            <Input
                              id="asset.coingecko_id"
                              name="asset.coingecko_id"
                              value={formData.asset.coingecko_id}
                              onChange={handleChange}
                              placeholder="e.g., bitcoin"
                              className="h-8 text-xs sm:text-sm"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="block text-xs font-medium mb-1">Keywords</label>
                            {formData.asset.keywords.length > 0 && (
                              <div className="flex flex-wrap gap-1 sm:gap-2 mb-2">
                                {formData.asset.keywords.map((keyword, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center bg-secondary px-2 py-1 rounded-md text-xs"
                                  >
                                    <span>{keyword}</span>
                                    <button
                                      type="button"
                                      onClick={() => removeKeyword(index)}
                                      className="ml-1 text-red-500"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="flex flex-col sm:flex-row gap-2">
                              <Input
                                value={currentKeyword}
                                onChange={(e) => setCurrentKeyword(e.target.value)}
                                placeholder="Add keyword"
                                className="h-8 text-xs sm:text-sm"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addKeyword();
                                  }
                                }}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={addKeyword}
                                className="h-8 text-xs"
                              >
                                Add
                              </Button>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>

                    <div className="mt-4">
                      <Button type="submit" className="w-full text-xs sm:text-sm py-2 h-8 sm:h-10">
                        Submit Changes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
