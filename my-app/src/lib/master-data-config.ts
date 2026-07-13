import type { IconName } from "@/components/icons";
import type { MasterDataKey } from "@/lib/api";

export type FieldType = "text" | "number" | "select" | "textarea" | "branch";

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  hint?: string;
  step?: string;
  /** show as its own table column */
  column?: boolean;
}

export interface ResourceDef {
  key: MasterDataKey;
  label: string;
  singular: string;
  icon: IconName;
  description: string;
  primary: string;
  fields: FieldDef[];
}

export const MASTER_DATA: ResourceDef[] = [
  {
    key: "units",
    label: "Units of Measure",
    singular: "Unit",
    icon: "scale",
    description: "kg, g, litre, ml, piece — referenced by recipes, stock and purchase orders.",
    primary: "name",
    fields: [
      { name: "name", label: "Name", type: "text", required: true, placeholder: "Kilogram" },
      { name: "symbol", label: "Symbol", type: "text", required: true, placeholder: "kg", column: true },
    ],
  },
  {
    key: "categories",
    label: "Categories",
    singular: "Category",
    icon: "grid",
    description: "Raw material, product and expense categories used across the platform.",
    primary: "name",
    fields: [
      { name: "name", label: "Name", type: "text", required: true, placeholder: "Dairy" },
      {
        name: "category_type",
        label: "Type",
        type: "select",
        required: true,
        column: true,
        options: [
          { value: "raw_material", label: "Raw Material" },
          { value: "product", label: "Product" },
          { value: "expense", label: "Expense" },
        ],
      },
    ],
  },
  {
    key: "taxes",
    label: "Taxes",
    singular: "Tax",
    icon: "receipt",
    description: "GST and product/branch-specific tax rates, effective-dated.",
    primary: "name",
    fields: [
      { name: "name", label: "Name", type: "text", required: true, placeholder: "Standard GST" },
      { name: "tax_type", label: "Tax type", type: "text", required: true, placeholder: "GST", column: true },
      { name: "percentage", label: "Percentage", type: "number", required: true, step: "0.01", placeholder: "16", column: true },
      { name: "branch_id", label: "Branch", type: "branch", hint: "Leave empty for a platform-wide rate." },
    ],
  },
  {
    key: "storage-locations",
    label: "Storage Locations",
    singular: "Storage Location",
    icon: "box",
    description: "Central store zones, finished-goods warehouse and branch storage areas.",
    primary: "name",
    fields: [
      { name: "name", label: "Name", type: "text", required: true, placeholder: "Cold Room 1" },
      {
        name: "location_type",
        label: "Location type",
        type: "select",
        required: true,
        column: true,
        options: [
          { value: "central_store", label: "Central Store" },
          { value: "finished_goods", label: "Finished Goods" },
          { value: "branch", label: "Branch" },
        ],
      },
      { name: "branch_id", label: "Branch", type: "branch", hint: "Required only for branch storage." },
    ],
  },
  {
    key: "packaging-types",
    label: "Packaging Types",
    singular: "Packaging Type",
    icon: "box",
    description: "Box sizes, packaging materials and labeling templates for recipes and dispatch.",
    primary: "name",
    fields: [
      { name: "name", label: "Name", type: "text", required: true, placeholder: "1lb Cake Box" },
      { name: "description", label: "Description", type: "textarea", placeholder: "Standard single-cake carton", column: true },
    ],
  },
  {
    key: "allergens",
    label: "Allergens",
    singular: "Allergen",
    icon: "alert",
    description: "The standard allergen list inherited automatically onto recipes.",
    primary: "name",
    fields: [{ name: "name", label: "Name", type: "text", required: true, placeholder: "Gluten" }],
  },
  {
    key: "reason-codes",
    label: "Reason Codes",
    singular: "Reason Code",
    icon: "tag",
    description: "Wastage, rejection, discrepancy and adjustment reason codes.",
    primary: "name",
    fields: [
      { name: "name", label: "Name", type: "text", required: true, placeholder: "Spillage" },
      { name: "code", label: "Code", type: "text", required: true, placeholder: "WST-SPL", column: true },
      {
        name: "reason_type",
        label: "Reason type",
        type: "select",
        required: true,
        column: true,
        options: [
          { value: "wastage", label: "Wastage" },
          { value: "rejection", label: "Rejection" },
          { value: "discrepancy", label: "Discrepancy" },
          { value: "adjustment", label: "Adjustment" },
        ],
      },
    ],
  },
  {
    key: "temperature-ranges",
    label: "Temperature Ranges",
    singular: "Temperature Range",
    icon: "thermometer",
    description: "Safe cold-chain ranges per product category (°C).",
    primary: "name",
    fields: [
      { name: "name", label: "Name", type: "text", required: true, placeholder: "Chilled / Dairy" },
      { name: "min_celsius", label: "Min °C", type: "number", required: true, step: "0.1", placeholder: "2", column: true },
      { name: "max_celsius", label: "Max °C", type: "number", step: "0.1", placeholder: "5", column: true },
    ],
  },
  {
    key: "configuration-values",
    label: "Configuration",
    singular: "Configuration Value",
    icon: "sliders",
    description: "Reorder thresholds, approval limits and other tunable system values.",
    primary: "key",
    fields: [
      { name: "key", label: "Key", type: "text", required: true, placeholder: "reorder_threshold_default" },
      { name: "value", label: "Value", type: "text", required: true, placeholder: "10", column: true },
      {
        name: "value_type",
        label: "Value type",
        type: "select",
        required: true,
        column: true,
        options: [
          { value: "number", label: "Number" },
          { value: "string", label: "String" },
          { value: "boolean", label: "Boolean" },
          { value: "percentage", label: "Percentage" },
        ],
      },
      { name: "description", label: "Description", type: "textarea", placeholder: "What this value controls" },
    ],
  },
];
