import type {
  Allergen,
  Branch,
  Category,
  ConfigurationValue,
  MeResponse,
  Organization,
  PackagingType,
  ReasonCode,
  Role,
  StorageLocation,
  Tax,
  TokenResponse,
  Unit,
  TemperatureRange,
  User,
} from "@/lib/types";

/** Master-data resources keyed by their API path segment. */
export const MASTER_DATA_RESOURCES = {
  units: "master-data/units",
  categories: "master-data/categories",
  taxes: "master-data/taxes",
  "storage-locations": "master-data/storage-locations",
  "packaging-types": "master-data/packaging-types",
  allergens: "master-data/allergens",
  "reason-codes": "master-data/reason-codes",
  "temperature-ranges": "master-data/temperature-ranges",
  "configuration-values": "master-data/configuration-values",
} as const;

export type MasterDataKey = keyof typeof MASTER_DATA_RESOURCES;

export interface MasterDataTypeMap {
  units: Unit;
  categories: Category;
  taxes: Tax;
  "storage-locations": StorageLocation;
  "packaging-types": PackagingType;
  allergens: Allergen;
  "reason-codes": ReasonCode;
  "temperature-ranges": TemperatureRange;
  "configuration-values": ConfigurationValue;
}

export interface ApiClient {
  // auth
  login(email: string, password: string): Promise<TokenResponse>;
  me(): Promise<MeResponse>;
  logout(): Promise<void>;

  // organizations
  listOrganizations(): Promise<Organization[]>;
  createOrganization(body: Partial<Organization>): Promise<Organization>;
  updateOrganization(id: string, body: Partial<Organization>): Promise<Organization>;

  // branches
  listBranches(): Promise<Branch[]>;
  createBranch(body: Partial<Branch>): Promise<Branch>;
  updateBranch(id: string, body: Partial<Branch>): Promise<Branch>;

  // users
  listUsers(): Promise<User[]>;
  createUser(body: Record<string, unknown>): Promise<User>;
  updateUser(id: number, body: Record<string, unknown>): Promise<User>;

  // roles & permissions
  listRoles(): Promise<Role[]>;
  createRole(name: string): Promise<Role>;
  assignPermissions(roleId: number, codes: string[]): Promise<Role>;

  // master data (generic)
  listMasterData<K extends MasterDataKey>(key: K): Promise<MasterDataTypeMap[K][]>;
  createMasterData<K extends MasterDataKey>(
    key: K,
    body: Record<string, unknown>,
  ): Promise<MasterDataTypeMap[K]>;
  updateMasterData<K extends MasterDataKey>(
    key: K,
    id: number,
    body: Record<string, unknown>,
  ): Promise<MasterDataTypeMap[K]>;
  deleteMasterData<K extends MasterDataKey>(key: K, id: number): Promise<void>;
}
