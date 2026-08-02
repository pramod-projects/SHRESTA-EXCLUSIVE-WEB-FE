"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import {
  ADMIN_TAG_MAX_COUNT,
  ADMIN_TAG_MAX_LENGTH,
  adminTagValues,
  enumDisplayLabel,
  enumValues,
  toAdminTagValue,
  toEnumValue
} from "@/lib/admin-enums";

type EnumMultiSelectProps = {
  label: string;
  name: string;
  options: string[];
  defaultValues?: string[];
  placeholder?: string;
  valueKind?: "enum" | "tag";
};

export function EnumMultiSelect({
  label,
  name,
  options,
  defaultValues = [],
  placeholder = "Select values",
  valueKind = "enum"
}: EnumMultiSelectProps) {
  const normalizeValues = valueKind === "tag" ? adminTagValues : enumValues;
  const normalizeValue = valueKind === "tag" ? toAdminTagValue : toEnumValue;
  const normalizedOptions = useMemo(() => normalizeValues(options), [normalizeValues, options]);
  const [selected, setSelected] = useState<string[]>(() => normalizeValues(defaultValues));
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleOptions = normalizedOptions.filter((option) => {
    if (!normalizedQuery) {
      return true;
    }
    return option.toLowerCase().includes(normalizedQuery) || enumDisplayLabel(option).toLowerCase().includes(normalizedQuery);
  });

  const toggle = (value: string) => {
    setSelected((current) => current.includes(value) ? current.filter((item) => item !== value) : normalizeValues([...current, value]));
  };

  const addQueryValue = () => {
    const value = normalizeValue(query);
    if (!value) {
      return;
    }
    setSelected((current) => normalizeValues([...current, value]));
    setQuery("");
    setOpen(true);
  };

  return (
    <label className="admin-label">
      {label}
      {selected.map((value) => (
        <input key={value} name={name} type="hidden" value={value} />
      ))}
      <div className="relative">
        <button
          aria-expanded={open}
          className="admin-input flex min-h-[48px] items-center justify-between gap-3 text-left"
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          <span className="flex min-w-0 flex-1 flex-wrap gap-1.5">
            {selected.length > 0 ? selected.slice(0, 4).map((value) => (
              <span className="inline-flex items-center gap-1 rounded-full bg-gold-500/14 px-2 py-1 text-[11px] font-bold text-gold-300" key={value}>
                <span className="max-w-[11rem] break-words leading-4">{value}</span>
              </span>
            )) : <span className="text-shresta-text-muted">{placeholder}</span>}
            {selected.length > 4 ? <span className="text-xs text-shresta-text-muted">+{selected.length - 4}</span> : null}
          </span>
          <ChevronDown className={open ? "h-4 w-4 rotate-180 text-gold-400 transition" : "h-4 w-4 text-gold-400 transition"} />
        </button>
        {open ? (
          <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-30 rounded-lg border border-wine-700 bg-wine-950 p-2 shadow-2xl">
            <div className="flex items-center gap-2 rounded-lg border border-wine-800 bg-wine-900/80 px-3">
              <Search className="h-4 w-4 text-shresta-text-muted" />
              <input
                className="min-h-10 flex-1 bg-transparent text-sm text-shresta-text-primary outline-none placeholder:text-shresta-text-muted"
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addQueryValue();
                  }
                }}
                maxLength={valueKind === "tag" ? ADMIN_TAG_MAX_LENGTH : undefined}
                placeholder="Search or type enum value"
                value={query}
              />
            </div>
            <div className="mt-2 max-h-56 overflow-auto pr-1">
              {visibleOptions.map((option) => {
                const active = selected.includes(option);
                return (
                  <button
                    className={active ? "flex w-full items-center justify-between rounded-md bg-gold-500/14 px-3 py-2 text-left text-sm text-gold-300" : "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-shresta-text-secondary hover:bg-wine-900 hover:text-gold-300"}
                    key={option}
                    onClick={() => toggle(option)}
                    type="button"
                  >
                    <span className="min-w-0">
                      <span className="block break-words font-semibold leading-5">{option}</span>
                      <span className="ml-2 text-xs text-shresta-text-muted">{enumDisplayLabel(option)}</span>
                    </span>
                    {active ? <Check className="h-4 w-4" /> : null}
                  </button>
                );
              })}
              {query.trim() ? (
                <button
                  className="mt-2 w-full rounded-md border border-dashed border-wine-700 px-3 py-2 text-left text-sm font-semibold text-gold-300 hover:border-gold-500"
                  onClick={addQueryValue}
                  type="button"
                >
                  Add {normalizeValue(query)}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
      {valueKind === "tag" ? (
        <span className="mt-1 text-[11px] font-medium leading-4 text-shresta-text-muted">
          Tags allow A-Z, 0-9, hyphen, and underscore. Max {ADMIN_TAG_MAX_LENGTH} characters, {ADMIN_TAG_MAX_COUNT} tags.
        </span>
      ) : null}
    </label>
  );
}
