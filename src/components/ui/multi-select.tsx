"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

export interface MultiSelectOption {
  value: string
  label: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select items...",
  searchPlaceholder = "Search...",
  emptyMessage = "No items found.",
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")

  const handleSelect = React.useCallback((value: string) => {
    console.log("handleSelect called with:", value)
    const newSelected = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value]
    console.log("New selected:", newSelected)
    onChange(newSelected)
  }, [selected, onChange])

  const handleRemove = (value: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(selected.filter((item) => item !== value))
  }

  const filteredOptions = React.useMemo(() => {
    if (!searchValue) return options
    return options.filter(option => 
      option.label.toLowerCase().includes(searchValue.toLowerCase()) ||
      option.value.toLowerCase().includes(searchValue.toLowerCase())
    )
  }, [options, searchValue])

  const selectedLabels = selected
    .map((value) => options.find((option) => option.value === value)?.label)
    .filter(Boolean)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between bg-black border-gray-600 hover:bg-gray-900 focus:bg-gray-900", className)}
        >
          <div className="flex flex-wrap gap-1 flex-1">
            {selected.length > 0 ? (
              selected.length > 2 ? (
                <Badge variant="secondary" className="rounded-sm px-1">
                  {selected.length} selected
                </Badge>
              ) : (
                selectedLabels.map((label, index) => (
                  <Badge
                    key={selected[index]}
                    variant="secondary"
                    className="rounded-sm px-1"
                  >
                    {label}
                    <span
                      className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer inline-flex"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleRemove(selected[index], e as unknown as React.MouseEvent)
                        }
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                      onClick={(e: React.MouseEvent) => handleRemove(selected[index], e)}
                      role="button"
                      tabIndex={0}
                    >
                      <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    </span>
                  </Badge>
                ))
              )
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 bg-black border-gray-600" align="start">
        <Command className="bg-black" shouldFilter={false} onValueChange={() => {}}>
          <CommandInput 
            placeholder={searchPlaceholder} 
            className="bg-black border-gray-600 text-white placeholder:text-gray-400"
            value={searchValue}
            onValueChange={setSearchValue}
          />
          {filteredOptions.length === 0 ? (
            <div className="text-gray-400 py-6 text-center">{emptyMessage}</div>
          ) : (
            <CommandGroup className="max-h-64 overflow-auto bg-black">
              {filteredOptions.map((option) => {
              const isSelected = selected.includes(option.value);
              return (
                <div
                  key={option.value}
                  className={cn(
                    "flex items-center cursor-pointer px-2 py-2 text-white transition-colors rounded-sm",
                    "hover:bg-gray-800",
                    isSelected && "bg-gray-900"
                  )}
                  onClick={() => {
                    console.log("Item clicked:", option.value)
                    handleSelect(option.value)
                  }}
                >
                  <div 
                    className={cn(
                      "mr-3 h-4 w-4 border border-gray-400 rounded flex items-center justify-center flex-shrink-0",
                      isSelected && "bg-blue-600 border-blue-600"
                    )}
                  >
                    <Check
                      className={cn(
                        "h-3 w-3 text-white",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </div>
                  <span className="flex-1">
                    {option.label}
                  </span>
                </div>
              );
            })}
            </CommandGroup>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
}