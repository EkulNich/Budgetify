import { useCallback, useEffect, useMemo, useState } from "react";

import { CATEGORIES, getCategoryColor, getCategoryIcon } from "@/constants/categories";
import {
  CategoryValidationError,
  validateCategoryName,
  type ExistingAlias,
  type ExistingCategory,
} from "@/lib/category-validation";
import { supabase } from "@/lib/supabase";

export type Category = {
  id: number;
  name: string;
  label: string;
  icon: string;
  color: string;
  scopeType: "personal" | "pool";
  ownerUserId: string | null;
  poolId: number | null;
  isArchived: boolean;
};

type Alias = { categoryId: number; oldName: string };

/**
 * A picker-ready option. `key` is what actually gets stored on an expense
 * when this option is selected — the system key for a built-in category, or
 * the custom category's normalized `name` — never an opaque id, so a picked
 * category round-trips through `expenses.category` exactly like the
 * existing 5 always have.
 */
export type CategoryOption = { key: string; label: string; color: string; icon: string };

/**
 * What a stored category string resolves to for *display*. `groupKey` is
 * deliberately NOT the same kind of value as `CategoryOption.key` — it's a
 * stable, rename-proof identifier (`custom:<id>`) meant only for grouping
 * many expenses together (Stats, Smart Insights), never for re-selecting or
 * re-storing a category.
 */
export type ResolvedCategory = { groupKey: string; label: string; icon: string; color: string };

export type CategoryScope = { type: "personal" } | { type: "pool"; poolId: number };

function toOption(c: Category): CategoryOption {
  return { key: c.name, label: c.label, color: c.color, icon: c.icon };
}

/**
 * Personal categories the user owns, pool categories for every pool they
 * belong to, and the aliases for all of them — fetched once, regardless of
 * archived status, so both scoped pickers (active only) and historical
 * display resolution (active + archived + aliases) are served from the same
 * data without a second round trip.
 */
export function useCategories(userId: string | undefined) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!userId) {
      setCategories([]);
      setAliases([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data: memberships } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", userId);
    const poolIds = (memberships ?? []).map((m) => m.group_id);

    const orClauses = [`owner_user_id.eq.${userId}`];
    if (poolIds.length > 0) {
      orClauses.push(`pool_id.in.(${poolIds.join(",")})`);
    }

    const { data: categoryRows, error: categoryError } = await supabase
      .from("categories")
      .select("id, name, label, icon, color, scope_type, owner_user_id, pool_id, is_archived")
      .or(orClauses.join(","));

    if (categoryError) {
      console.error("Failed to load categories:", categoryError.message);
      setLoading(false);
      return;
    }

    const rows: Category[] = (categoryRows ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      label: c.label,
      icon: c.icon,
      color: c.color,
      scopeType: c.scope_type,
      ownerUserId: c.owner_user_id,
      poolId: c.pool_id,
      isArchived: c.is_archived,
    }));
    setCategories(rows);

    const categoryIds = rows.map((c) => c.id);
    if (categoryIds.length === 0) {
      setAliases([]);
      setLoading(false);
      return;
    }

    const { data: aliasRows, error: aliasError } = await supabase
      .from("category_aliases")
      .select("category_id, old_name")
      .in("category_id", categoryIds);

    if (aliasError) {
      console.error("Failed to load category aliases:", aliasError.message);
    } else {
      setAliases((aliasRows ?? []).map((a) => ({ categoryId: a.category_id, oldName: a.old_name })));
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const personalCategories = useMemo(
    () => categories.filter((c) => c.scopeType === "personal"),
    [categories],
  );
  const poolCategoriesFor = useCallback(
    (poolId: number) => categories.filter((c) => c.scopeType === "pool" && c.poolId === poolId),
    [categories],
  );
  const categoriesForScope = useCallback(
    (scope: CategoryScope) =>
      scope.type === "personal" ? personalCategories : poolCategoriesFor(scope.poolId),
    [personalCategories, poolCategoriesFor],
  );

  const forPersonal = useCallback((): CategoryOption[] => {
    return personalCategories.filter((c) => !c.isArchived).map(toOption);
  }, [personalCategories]);

  const forPool = useCallback(
    (poolId: number): CategoryOption[] => {
      return poolCategoriesFor(poolId)
        .filter((c) => !c.isArchived)
        .map(toOption);
    },
    [poolCategoriesFor],
  );

/** system -> current custom name -> alias -> generic fallback, all within one scope. */
  const resolve = useCallback(
    (name: string | null, scope: CategoryScope): ResolvedCategory => {
      const normalized = (name ?? "").toLowerCase().trim();

      const system = CATEGORIES.find((c) => c.key === normalized);
      if (system) {
        return { groupKey: system.key, label: system.label, color: system.color, icon: system.icon };
      }

      const scoped = categoriesForScope(scope);

      const current = scoped.find((c) => c.name === normalized);
      if (current) {
        return { groupKey: `custom:${current.id}`, label: current.label, color: current.color, icon: current.icon };
      }

      const scopedIds = new Set(scoped.map((c) => c.id));
      const alias = aliases.find((a) => a.oldName === normalized && scopedIds.has(a.categoryId));
      if (alias) {
        const target = scoped.find((c) => c.id === alias.categoryId);
        if (target) {
          return { groupKey: `custom:${target.id}`, label: target.label, color: target.color, icon: target.icon };
        }
      }

      return {
        groupKey: normalized || "others",
        label: name ?? "Others",
        color: getCategoryColor(normalized),
        icon: getCategoryIcon(normalized),
      };
    },
    [categoriesForScope, aliases],
  );

  const buildValidationInputs = useCallback(
    (scope: CategoryScope, excludeId?: number) => {
      const scoped = categoriesForScope(scope).filter((c) => c.id !== excludeId);
      const scopedIds = new Set(scoped.map((c) => c.id));
      const existing: ExistingCategory[] = scoped.map((c) => ({
        id: c.id,
        name: c.name,
        label: c.label,
        isArchived: c.isArchived,
      }));
      const scopedAliases: ExistingAlias[] = aliases
        .filter((a) => scopedIds.has(a.categoryId) && a.categoryId !== excludeId)
        .map((a) => ({
          oldName: a.oldName,
          currentLabel: scoped.find((c) => c.id === a.categoryId)?.label ?? a.oldName,
        }));
      return { existing, scopedAliases };
    },
    [categoriesForScope, aliases],
  );

  const createCategory = useCallback(
    async (scope: CategoryScope, label: string, icon: string, color: string): Promise<string> => {
      const { existing, scopedAliases } = buildValidationInputs(scope);
      const check = validateCategoryName(label, existing, scopedAliases);
      if (!check.valid) throw new CategoryValidationError(check);

      const { error } = await supabase.rpc("create_category", {
        p_scope_type: scope.type,
        p_owner_user_id: scope.type === "personal" ? userId : null,
        p_pool_id: scope.type === "pool" ? scope.poolId : null,
        p_label: label.trim(),
        p_icon: icon,
        p_color: color,
      });
      if (error) {
        console.error("Failed to create category:", error.message);
        throw error;
      }
      await refetch();
      return check.normalized;
    },
    [buildValidationInputs, userId, refetch],
  );

  const renameCategory = useCallback(
    async (id: number, label: string, icon?: string, color?: string) => {
      const target = categories.find((c) => c.id === id);
      if (!target) throw new Error("Category not found");
      const scope: CategoryScope =
        target.scopeType === "personal" ? { type: "personal" } : { type: "pool", poolId: target.poolId! };

      const { existing, scopedAliases } = buildValidationInputs(scope, id);
      const check = validateCategoryName(label, existing, scopedAliases);
      if (!check.valid) throw new CategoryValidationError(check);

      const { error } = await supabase.rpc("rename_category", {
        p_category_id: id,
        p_new_label: label.trim(),
        p_new_icon: icon ?? null,
        p_new_color: color ?? null,
      });
      if (error) {
        console.error("Failed to rename category:", error.message);
        throw error;
      }
      await refetch();
    },
    [categories, buildValidationInputs, refetch],
  );

  const restoreCategory = useCallback(
    async (id: number, updates?: { icon?: string; color?: string }) => {
      const { error } = await supabase
        .from("categories")
        .update({ is_archived: false, ...updates })
        .eq("id", id);
      if (error) {
        console.error("Failed to restore category:", error.message);
        throw error;
      }
      await refetch();
    },
    [refetch],
  );

  const updateCategoryAppearance = useCallback(
    async (id: number, updates: { icon?: string; color?: string }) => {
      const { error } = await supabase.from("categories").update(updates).eq("id", id);
      if (error) {
        console.error("Failed to update category:", error.message);
        throw error;
      }
      await refetch();
    },
    [refetch],
  );

  const archiveCategory = useCallback(
    async (id: number) => {
      const { error } = await supabase.from("categories").update({ is_archived: true }).eq("id", id);
      if (error) {
        console.error("Failed to archive category:", error.message);
        throw error;
      }
      await refetch();
    },
    [refetch],
  );

  return {
    loading,
    personalCategories,
    poolCategoriesFor,
    forPersonal,
    forPool,
    resolve,
    createCategory,
    renameCategory,
    restoreCategory,
    updateCategoryAppearance,
    archiveCategory,
    refetch,
  };
}
