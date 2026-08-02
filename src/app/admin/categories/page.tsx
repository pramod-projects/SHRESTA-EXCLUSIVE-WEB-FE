import { randomUUID } from "crypto";
import type { ReactNode } from "react";
import {
  createAttributeAction,
  createCategoryFamilyAction,
  createFilterAction,
  createProductTypeAction,
  createStylingAction,
  createTaxAction,
  submitAdminChangeRequestAction,
  updateAttributeAction,
  updateCategoryFamilyAction,
  updateFilterAction,
  updateProductTypeAction,
  updateStylingAction,
  updateTaxAction
} from "@/app/admin/actions";
import { AdminApiUnavailable } from "@/components/admin/admin-api-unavailable";
import { fetchAdminCategories } from "@/features/admin/admin-api";
import type {
  CategoryAttribute,
  CategoryFamily,
  CategoryFilter,
  CategoryProductType,
  CategoryStyling,
  CategoryTax
} from "@/features/catalog/category-config";
import { INPUT_PATTERNS, INPUT_PATTERN_TITLES } from "@/lib/input-patterns";
import { nullWhenShrestaApiUnavailable } from "@/lib/api-page-fallback";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const categories = await nullWhenShrestaApiUnavailable(() => fetchAdminCategories());
  if (!categories) {
    return <AdminApiUnavailable />;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 border-b border-[var(--wine-800)] pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-400)]">Catalog Configuration</p>
          <h1 className="mt-2 font-serif text-4xl font-light text-white">Categories</h1>
        </div>
        <div className="text-sm text-[var(--shresta-text-muted)]">{categories.length} active families</div>
      </header>

      <details className="admin-panel rounded-lg p-4" open>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl font-light text-white">Create Category Family</h2>
            <p className="mt-1 text-sm text-[var(--shresta-text-muted)]">Add a new top-level catalog family with its operational details.</p>
          </div>
          <span className="rounded-full bg-[rgba(212,175,55,0.14)] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-300)]">New family</span>
        </summary>
        <form action={createCategoryFamilyAction} className="mt-5 grid gap-3 lg:grid-cols-6">
          <HiddenMutationKey />
          <Label title="Family Key"><input className="admin-input" name="familyKey" pattern={INPUT_PATTERNS.snakeKey} placeholder="silk_saree" required title={INPUT_PATTERN_TITLES.snakeKey} /></Label>
          <Label title="Display Name"><input className="admin-input" name="displayName" placeholder="Silk Sarees" required /></Label>
          <Label title="Sort Order"><input className="admin-input" min="0" name="sortOrder" type="number" /></Label>
          <Label className="lg:col-span-3" title="Description"><input className="admin-input" name="description" placeholder="Buyer-facing category description" /></Label>
          <Label className="lg:col-span-5" title="Advanced Details JSON"><textarea className="admin-input min-h-24" defaultValue="{}" name="metadata" /></Label>
          <button className="admin-button" type="submit">Create</button>
        </form>
      </details>

      <section className="space-y-5">
        {categories.map((family) => (
          <article className="admin-panel rounded-lg p-4" key={family.familyKey}>
            <div className="flex flex-col gap-3 border-b border-[var(--wine-800)] pb-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="font-serif text-3xl font-light text-white">{family.displayName}</h2>
                <p className="mt-1 text-sm text-[var(--shresta-text-muted)]">{family.familyKey} - sort {family.sortOrder}</p>
                {family.description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--shresta-text-secondary)]">{family.description}</p> : null}
              </div>
              <ReviewRemovalForms
                entityKey={family.familyKey}
                entityType="category_family_config"
                payload={{ familyKey: family.familyKey }}
                requestType="category-family-removal"
              />
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-5">
              <MetricTile label="Subcategories" value={family.productTypes.length.toString()} />
              <MetricTile label="Attributes" value={family.attributes.length.toString()} />
              <MetricTile label="Filters" value={family.filters.length.toString()} />
              <MetricTile label="Tax Rules" value={family.taxes.length.toString()} />
              <MetricTile label="Styling Rules" value={family.styling.length.toString()} />
            </div>

            <details className="admin-surface mt-5 rounded-lg p-4" open>
              <summary className="cursor-pointer list-none font-serif text-xl font-light text-white">Family Details</summary>
              <form action={updateCategoryFamilyAction} className="mt-4 grid gap-3 lg:grid-cols-6">
                <HiddenMutationKey />
                <input name="familyKey" type="hidden" value={family.familyKey} />
                <Label title="Display Name"><input className="admin-input" defaultValue={family.displayName} name="displayName" required /></Label>
                <Label title="Sort Order"><input className="admin-input" defaultValue={family.sortOrder} min="0" name="sortOrder" type="number" /></Label>
                <Label className="lg:col-span-4" title="Description"><input className="admin-input" defaultValue={family.description ?? ""} name="description" /></Label>
                <Label className="lg:col-span-5" title="Advanced Details JSON"><textarea className="admin-input min-h-24" defaultValue={json(family.metadata)} name="metadata" /></Label>
                <button className="admin-button" type="submit">Update</button>
              </form>
            </details>

            <ConfigBlock title={`Subcategories (${family.productTypes.length})`}>
              <form action={createProductTypeAction} className="grid gap-3 lg:grid-cols-5">
                <HiddenMutationKey />
                <input name="familyKey" type="hidden" value={family.familyKey} />
                <Label title="Type Key"><input className="admin-input" name="typeKey" pattern={INPUT_PATTERNS.snakeKey} required title={INPUT_PATTERN_TITLES.snakeKey} /></Label>
                <Label title="Display Name"><input className="admin-input" name="displayName" required /></Label>
                <Label title="Sort Order"><input className="admin-input" min="0" name="sortOrder" type="number" /></Label>
                <Label title="Advanced Details JSON"><input className="admin-input" defaultValue="{}" name="metadata" /></Label>
                <button className="admin-button" type="submit">Add</button>
              </form>
              <div className="mt-3 space-y-3">
                {family.productTypes.map((productType) => (
                  <ProductTypeRow family={family} key={productType.typeKey} productType={productType} />
                ))}
              </div>
            </ConfigBlock>

            <ConfigBlock title={`Attributes (${family.attributes.length})`}>
              <form action={createAttributeAction} className="grid gap-3 lg:grid-cols-7">
                <HiddenMutationKey />
                <input name="familyKey" type="hidden" value={family.familyKey} />
                <Label title="Attribute Key"><input className="admin-input" name="attributeKey" pattern={INPUT_PATTERNS.snakeKey} required title={INPUT_PATTERN_TITLES.snakeKey} /></Label>
                <Label title="Display Name"><input className="admin-input" name="displayName" required /></Label>
                <DataTypeSelect />
                <Checkbox name="required" title="Required" />
                <Checkbox name="filterable" title="Filterable" />
                <Checkbox name="searchable" title="Searchable" />
                <Label title="Sort"><input className="admin-input" min="0" name="sortOrder" type="number" /></Label>
                <Label className="lg:col-span-6" title="Allowed Values"><textarea className="admin-input min-h-20" name="allowedValues" /></Label>
                <button className="admin-button" type="submit">Add</button>
              </form>
              <div className="mt-3 space-y-3">
                {family.attributes.map((attribute) => (
                  <AttributeRow attribute={attribute} family={family} key={attribute.attributeKey} />
                ))}
              </div>
            </ConfigBlock>

            <ConfigBlock title={`Filters (${family.filters.length})`}>
              <form action={createFilterAction} className="grid gap-3 lg:grid-cols-6">
                <HiddenMutationKey />
                <input name="familyKey" type="hidden" value={family.familyKey} />
                <Label title="Filter Key"><input className="admin-input" name="filterKey" pattern={INPUT_PATTERNS.snakeKey} required title={INPUT_PATTERN_TITLES.snakeKey} /></Label>
                <Label title="Display Name"><input className="admin-input" name="displayName" required /></Label>
                <AttributeSelect attributes={family.attributes} />
                <ControlSelect />
                <Label title="Facet Mapping"><input className="admin-input" name="backendMapping" pattern={INPUT_PATTERNS.backendMapping} placeholder="attribute_facets.key" required title={INPUT_PATTERN_TITLES.backendMapping} /></Label>
                <Label title="Sort"><input className="admin-input" min="0" name="sortOrder" type="number" /></Label>
                <button className="admin-button lg:col-start-6" type="submit">Add</button>
              </form>
              <div className="mt-3 space-y-3">
                {family.filters.map((filter) => (
                  <FilterRow family={family} filter={filter} key={filter.filterKey} />
                ))}
              </div>
            </ConfigBlock>

            <ConfigBlock title={`Tax Rules (${family.taxes.length})`}>
              <form action={createTaxAction} className="grid gap-3 lg:grid-cols-5">
                <HiddenMutationKey />
                <input name="familyKey" type="hidden" value={family.familyKey} />
                <Label title="HSN Code"><input className="admin-input" inputMode="numeric" name="hsnCode" pattern={INPUT_PATTERNS.hsnCode} required title={INPUT_PATTERN_TITLES.hsnCode} /></Label>
                <Label title="GST BPS"><input className="admin-input" max="2800" min="0" name="gstRateBasisPoints" required type="number" /></Label>
                <Label title="Effective From"><input className="admin-input" name="effectiveFrom" required type="date" /></Label>
                <Label title="Effective To"><input className="admin-input" name="effectiveTo" type="date" /></Label>
                <button className="admin-button" type="submit">Add</button>
              </form>
              <div className="mt-3 space-y-3">
                {family.taxes.map((tax) => (
                  <TaxRow family={family} key={`${tax.hsnCode}-${tax.effectiveFrom}`} tax={tax} />
                ))}
              </div>
            </ConfigBlock>

            <ConfigBlock title={`Styling Rules (${family.styling.length})`}>
              <form action={createStylingAction} className="grid gap-3 lg:grid-cols-5">
                <HiddenMutationKey />
                <input name="familyKey" type="hidden" value={family.familyKey} />
                <Label title="Occasion Key"><input className="admin-input" name="occasionKey" pattern={INPUT_PATTERNS.snakeKey} required title={INPUT_PATTERN_TITLES.snakeKey} /></Label>
                <Label title="Display Name"><input className="admin-input" name="displayName" required /></Label>
                <Label title="Sort"><input className="admin-input" min="0" name="sortOrder" type="number" /></Label>
                <Label className="lg:col-span-2" title="Complementary Families"><input className="admin-input" name="complementaryFamilyKeys" /></Label>
                <Label className="lg:col-span-4" title="Rules JSON"><textarea className="admin-input min-h-20" defaultValue="{}" name="rules" /></Label>
                <button className="admin-button" type="submit">Add</button>
              </form>
              <div className="mt-3 space-y-3">
                {family.styling.map((styling) => (
                  <StylingRow family={family} key={styling.occasionKey} styling={styling} />
                ))}
              </div>
            </ConfigBlock>
          </article>
        ))}
      </section>
    </div>
  );
}

function ProductTypeRow({ family, productType }: { family: CategoryFamily; productType: CategoryProductType }) {
  return (
    <div className="rounded-lg border border-[var(--wine-800)] p-3">
      <form action={updateProductTypeAction} className="grid gap-3 lg:grid-cols-5">
        <HiddenMutationKey />
        <input name="familyKey" type="hidden" value={family.familyKey} />
        <input name="typeKey" type="hidden" value={productType.typeKey} />
        <Label title="Type Key"><input className="admin-input" disabled value={productType.typeKey} /></Label>
        <Label title="Display Name"><input className="admin-input" defaultValue={productType.displayName} name="displayName" required /></Label>
        <Label title="Sort"><input className="admin-input" defaultValue={productType.sortOrder} min="0" name="sortOrder" type="number" /></Label>
        <Label title="Advanced Details JSON"><input className="admin-input" defaultValue={json(productType.metadata)} name="metadata" /></Label>
        <button className="admin-button" type="submit">Update</button>
      </form>
      <ReviewRemovalForms
        entityKey={`${family.familyKey}:${productType.typeKey}`}
        entityType="category_product_type_config"
        payload={{ familyKey: family.familyKey, typeKey: productType.typeKey }}
        requestType="category-product-type-removal"
      />
    </div>
  );
}

function AttributeRow({ family, attribute }: { family: CategoryFamily; attribute: CategoryAttribute }) {
  return (
    <div className="rounded-lg border border-[var(--wine-800)] p-3">
      <form action={updateAttributeAction} className="grid gap-3 lg:grid-cols-7">
        <HiddenMutationKey />
        <input name="familyKey" type="hidden" value={family.familyKey} />
        <input name="attributeKey" type="hidden" value={attribute.attributeKey} />
        <Label title="Attribute Key"><input className="admin-input" disabled value={attribute.attributeKey} /></Label>
        <Label title="Display Name"><input className="admin-input" defaultValue={attribute.displayName} name="displayName" required /></Label>
        <DataTypeSelect defaultValue={attribute.dataType} />
        <Checkbox defaultChecked={attribute.required} name="required" title="Required" />
        <Checkbox defaultChecked={attribute.filterable} name="filterable" title="Filterable" />
        <Checkbox defaultChecked={attribute.searchable} name="searchable" title="Searchable" />
        <Label title="Sort"><input className="admin-input" defaultValue={attribute.sortOrder} min="0" name="sortOrder" type="number" /></Label>
        <Label className="lg:col-span-6" title="Allowed Values"><textarea className="admin-input min-h-20" defaultValue={attribute.allowedValues.join(", ")} name="allowedValues" /></Label>
        <button className="admin-button" type="submit">Update</button>
      </form>
      <ReviewRemovalForms
        entityKey={`${family.familyKey}:${attribute.attributeKey}`}
        entityType="category_attribute_config"
        payload={{ familyKey: family.familyKey, attributeKey: attribute.attributeKey }}
        requestType="category-attribute-removal"
      />
    </div>
  );
}

function FilterRow({ family, filter }: { family: CategoryFamily; filter: CategoryFilter }) {
  return (
    <div className="rounded-lg border border-[var(--wine-800)] p-3">
      <form action={updateFilterAction} className="grid gap-3 lg:grid-cols-6">
        <HiddenMutationKey />
        <input name="familyKey" type="hidden" value={family.familyKey} />
        <input name="filterKey" type="hidden" value={filter.filterKey} />
        <Label title="Filter Key"><input className="admin-input" disabled value={filter.filterKey} /></Label>
        <Label title="Display Name"><input className="admin-input" defaultValue={filter.displayName} name="displayName" required /></Label>
        <AttributeSelect attributes={family.attributes} defaultValue={filter.attributeKey} />
        <ControlSelect defaultValue={filter.frontendControl} />
        <Label title="Facet Mapping"><input className="admin-input" defaultValue={filter.backendMapping} name="backendMapping" pattern={INPUT_PATTERNS.backendMapping} required title={INPUT_PATTERN_TITLES.backendMapping} /></Label>
        <Label title="Sort"><input className="admin-input" defaultValue={filter.sortOrder} min="0" name="sortOrder" type="number" /></Label>
        <button className="admin-button lg:col-start-6" type="submit">Update</button>
      </form>
      <ReviewRemovalForms
        entityKey={`${family.familyKey}:${filter.filterKey}`}
        entityType="category_filter_config"
        payload={{ familyKey: family.familyKey, filterKey: filter.filterKey }}
        requestType="category-filter-removal"
      />
    </div>
  );
}

function TaxRow({ family, tax }: { family: CategoryFamily; tax: CategoryTax }) {
  return (
    <div className="rounded-lg border border-[var(--wine-800)] p-3">
      <form action={updateTaxAction} className="grid gap-3 lg:grid-cols-5">
        <HiddenMutationKey />
        <input name="familyKey" type="hidden" value={family.familyKey} />
        <input name="targetHsnCode" type="hidden" value={tax.hsnCode} />
        <input name="targetEffectiveFrom" type="hidden" value={tax.effectiveFrom} />
        <Label title="HSN Code"><input className="admin-input" defaultValue={tax.hsnCode} inputMode="numeric" name="hsnCode" pattern={INPUT_PATTERNS.hsnCode} required title={INPUT_PATTERN_TITLES.hsnCode} /></Label>
        <Label title="GST BPS"><input className="admin-input" defaultValue={tax.gstRateBasisPoints} max="2800" min="0" name="gstRateBasisPoints" required type="number" /></Label>
        <Label title="Effective From"><input className="admin-input" defaultValue={tax.effectiveFrom} name="effectiveFrom" required type="date" /></Label>
        <Label title="Effective To"><input className="admin-input" defaultValue={tax.effectiveTo ?? ""} name="effectiveTo" type="date" /></Label>
        <button className="admin-button" type="submit">Update</button>
      </form>
      <ReviewRemovalForms
        entityKey={`${family.familyKey}:${tax.hsnCode}:${tax.effectiveFrom}`}
        entityType="category_tax_config"
        payload={{ familyKey: family.familyKey, hsnCode: tax.hsnCode, effectiveFrom: tax.effectiveFrom }}
        requestType="category-tax-removal"
      />
    </div>
  );
}

function StylingRow({ family, styling }: { family: CategoryFamily; styling: CategoryStyling }) {
  return (
    <div className="rounded-lg border border-[var(--wine-800)] p-3">
      <form action={updateStylingAction} className="grid gap-3 lg:grid-cols-5">
        <HiddenMutationKey />
        <input name="familyKey" type="hidden" value={family.familyKey} />
        <input name="occasionKey" type="hidden" value={styling.occasionKey} />
        <Label title="Occasion Key"><input className="admin-input" disabled value={styling.occasionKey} /></Label>
        <Label title="Display Name"><input className="admin-input" defaultValue={styling.displayName} name="displayName" required /></Label>
        <Label title="Sort"><input className="admin-input" defaultValue={styling.sortOrder} min="0" name="sortOrder" type="number" /></Label>
        <Label className="lg:col-span-2" title="Complementary Families"><input className="admin-input" defaultValue={styling.complementaryFamilyKeys.join(", ")} name="complementaryFamilyKeys" /></Label>
        <Label className="lg:col-span-4" title="Rules JSON"><textarea className="admin-input min-h-20" defaultValue={json(styling.rules)} name="rules" /></Label>
        <button className="admin-button" type="submit">Update</button>
      </form>
      <ReviewRemovalForms
        entityKey={`${family.familyKey}:${styling.occasionKey}`}
        entityType="category_styling_config"
        payload={{ familyKey: family.familyKey, occasionKey: styling.occasionKey }}
        requestType="category-styling-removal"
      />
    </div>
  );
}

function ReviewRemovalForms({
  requestType,
  entityType,
  entityKey,
  payload
}: {
  requestType: string;
  entityType: string;
  entityKey: string;
  payload: Record<string, string>;
}) {
  return (
    <div className="mt-3 flex flex-wrap justify-end gap-2">
      <form action={submitAdminChangeRequestAction}>
        <HiddenMutationKey />
        <input name="requestType" type="hidden" value={requestType} />
        <input name="entityType" type="hidden" value={entityType} />
        <input name="entityKey" type="hidden" value={entityKey} />
        <input name="requestAction" type="hidden" value="ARCHIVE" />
        <input name="payload" type="hidden" value={JSON.stringify(payload)} />
        <input name="submitterRole" type="hidden" value="CHANGE_SUBMITTER" />
        <button className="admin-button secondary" type="submit">Request Archive</button>
      </form>
      <form action={submitAdminChangeRequestAction}>
        <HiddenMutationKey />
        <input name="requestType" type="hidden" value={requestType} />
        <input name="entityType" type="hidden" value={entityType} />
        <input name="entityKey" type="hidden" value={entityKey} />
        <input name="requestAction" type="hidden" value="DELETE" />
        <input name="payload" type="hidden" value={JSON.stringify(payload)} />
        <input name="submitterRole" type="hidden" value="CHANGE_SUBMITTER" />
        <button className="admin-button danger" type="submit">Request Delete</button>
      </form>
    </div>
  );
}

function ConfigBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="admin-surface mt-4 rounded-lg p-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
        <h3 className="font-serif text-xl font-light text-white">{title}</h3>
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--shresta-text-muted)]">Open editor</span>
      </summary>
      <div className="mt-4 border-t border-[var(--wine-800)] pt-4">{children}</div>
    </details>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--wine-800)] bg-[rgba(26,9,12,0.32)] p-3">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--shresta-text-muted)]">{label}</p>
      <p className="mt-1 font-serif text-2xl font-light text-white">{value}</p>
    </div>
  );
}

function Label({ title, className = "", children }: { title: string; className?: string; children: ReactNode }) {
  return (
    <label className={`admin-label ${className}`}>
      {title}
      {children}
    </label>
  );
}

function Checkbox({ name, title, defaultChecked = false }: { name: string; title: string; defaultChecked?: boolean }) {
  return (
    <label className="flex min-h-[42px] items-center gap-2 rounded-lg border border-[var(--wine-800)] px-3 text-sm text-[var(--shresta-text-secondary)]">
      <input defaultChecked={defaultChecked} name={name} type="checkbox" />
      {title}
    </label>
  );
}

function DataTypeSelect({ defaultValue = "string" }: { defaultValue?: string }) {
  return (
    <Label title="Data Type">
      <select className="admin-input" defaultValue={defaultValue} name="dataType">
        {["string", "integer", "boolean", "decimal", "enum", "multi_enum"].map((type) => (
          <option key={type} value={type}>{type}</option>
        ))}
      </select>
    </Label>
  );
}

function ControlSelect({ defaultValue = "checkbox" }: { defaultValue?: string }) {
  return (
    <Label title="Control">
      <select className="admin-input" defaultValue={defaultValue} name="frontendControl">
        {["checkbox", "radio", "range", "toggle", "swatch"].map((control) => (
          <option key={control} value={control}>{control}</option>
        ))}
      </select>
    </Label>
  );
}

function AttributeSelect({ attributes, defaultValue }: { attributes: CategoryAttribute[]; defaultValue?: string }) {
  return (
    <Label title="Attribute">
      <select className="admin-input" defaultValue={defaultValue} name="attributeKey" required>
        {attributes.map((attribute) => (
          <option key={attribute.attributeKey} value={attribute.attributeKey}>{attribute.displayName}</option>
        ))}
      </select>
    </Label>
  );
}

function HiddenMutationKey() {
  return <input name="idempotencyKey" type="hidden" value={randomUUID()} />;
}

function json(value: Record<string, unknown>): string {
  return JSON.stringify(value, null, 2);
}
