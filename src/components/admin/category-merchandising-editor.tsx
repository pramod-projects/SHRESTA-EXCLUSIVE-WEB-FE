"use client";

import { useState } from "react";
import {
  BadgeCheck,
  Crown,
  Flame,
  Gem,
  Heart,
  Medal,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
  WandSparkles,
  type LucideIcon
} from "lucide-react";
import { updateCategoryMerchandisingAction } from "@/app/admin/actions";
import { AdminActionForm, AdminSubmitButton } from "@/components/admin/admin-action-form";
import {
  MERCHANDISING_ICON_NAMES,
  colorFilters,
  merchandisingTags,
  type ColorFilterOption,
  type MerchandisingIconName,
  type MerchandisingTagOption
} from "@/lib/category-merchandising";

const ICONS: Record<MerchandisingIconName, LucideIcon> = {
  BadgeCheck,
  Crown,
  Flame,
  Gem,
  Heart,
  Medal,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
  WandSparkles
};

export function CategoryMerchandisingEditor({
  familyKey,
  idempotencyKey,
  metadata
}: {
  familyKey: string;
  idempotencyKey: string;
  metadata: Record<string, unknown>;
}) {
  const [tags, setTags] = useState<MerchandisingTagOption[]>(() => merchandisingTags(metadata));
  const [colors, setColors] = useState<ColorFilterOption[]>(() => colorFilters(metadata));

  return (
    <AdminActionForm action={updateCategoryMerchandisingAction} className="mt-4 space-y-5">
      <input name="familyKey" type="hidden" value={familyKey} />
      <input name="idempotencyKey" type="hidden" value={idempotencyKey} />
      <input name="merchandisingTags" type="hidden" value={JSON.stringify(tags)} />
      <input name="colorFilters" type="hidden" value={JSON.stringify(colors)} />

      <OptionSection
        add={() => setTags((current) => [...current, { value: "", label: "", icon: "Tag" }])}
        title="Product tags"
      >
        {tags.map((tag, index) => {
          const Icon = ICONS[tag.icon];
          return (
            <div className="grid gap-2 rounded-md border border-[var(--shresta-logo-border)] p-3 lg:grid-cols-[1fr_1fr_1fr_auto]" key={`${index}-${tag.value}`}>
              <input className="admin-input" onChange={(event) => updateTag(index, { value: event.target.value })} placeholder="BESTSELLER" value={tag.value} />
              <input className="admin-input" onChange={(event) => updateTag(index, { label: event.target.value })} placeholder="Bestseller" value={tag.label} />
              <label className="flex items-center gap-2">
                <Icon className="h-4 w-4 shrink-0 text-[var(--gold-500)]" />
                <select className="admin-input" onChange={(event) => updateTag(index, { icon: event.target.value as MerchandisingIconName })} value={tag.icon}>
                  {MERCHANDISING_ICON_NAMES.map((iconName) => <option key={iconName} value={iconName}>{iconName}</option>)}
                </select>
              </label>
              <RemoveButton onClick={() => setTags((current) => current.filter((_, itemIndex) => itemIndex !== index))} />
            </div>
          );
        })}
      </OptionSection>

      <OptionSection
        add={() => setColors((current) => [...current, { value: "", label: "" }])}
        title="Colour filters"
      >
        {colors.map((color, index) => (
          <div className="grid gap-2 rounded-md border border-[var(--shresta-logo-border)] p-3 lg:grid-cols-[1fr_1fr_auto]" key={`${index}-${color.value}`}>
            <input className="admin-input" onChange={(event) => updateColor(index, { value: event.target.value })} placeholder="COLOR_MAROON" value={color.value} />
            <input className="admin-input" onChange={(event) => updateColor(index, { label: event.target.value })} placeholder="Maroon" value={color.label} />
            <RemoveButton onClick={() => setColors((current) => current.filter((_, itemIndex) => itemIndex !== index))} />
          </div>
        ))}
      </OptionSection>

      <AdminSubmitButton label="Submit Tag and Colour Options for Review" />
    </AdminActionForm>
  );

  function updateTag(index: number, patch: Partial<MerchandisingTagOption>) {
    setTags((current) => current.map((tag, itemIndex) => itemIndex === index ? { ...tag, ...patch } : tag));
  }

  function updateColor(index: number, patch: Partial<ColorFilterOption>) {
    setColors((current) => current.map((color, itemIndex) => itemIndex === index ? { ...color, ...patch } : color));
  }
}

function OptionSection({ add, children, title }: { add: () => void; children: React.ReactNode; title: string }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-[var(--shresta-logo-text)]">{title}</h4>
        <button className="admin-button secondary" onClick={add} type="button">Add option</button>
      </div>
      {children}
    </section>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return <button aria-label="Remove option" className="admin-button danger" onClick={onClick} type="button">Remove</button>;
}
