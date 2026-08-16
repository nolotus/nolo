// create/category/useCategories.ts
import { useState } from "react";
import { useAppDispatch } from "app/store";
import { useUserId } from "identity";
import { write } from "database/dbSlice";
import { DataType } from "create/types";

interface Category {
  type: DataType.Category;
  id: string;
  name: string;
  parentId?: string;
  isCollapsed: boolean;
  order: number;
}

interface CategoryConfig {
  data: Category;
  userId: string;
}

interface UseCategoriesResult {
  create: (name: string, parentId?: string) => Promise<Category>;
  toggleCollapse: (id: string) => Promise<Category>;
  isLoading: boolean;
  error: string | null;
}

export const useCategories = (): UseCategoriesResult => {
  const dispatch = useAppDispatch();
  const currentUserId = useUserId();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async (name: string, parentId?: string): Promise<Category> => {
    setIsLoading(true);
    setError(null);
    try {
      const categoryConfig: CategoryConfig = {
        data: {
          type: DataType.Category,
          id: `cat-${Date.now()}`,
          name,
          parentId,
          isCollapsed: false,
          order: 0, // You might want to determine this based on existing categories
        },
        userId: currentUserId as string,
      };
      const result = await dispatch(
        write({
          data: categoryConfig.data,
          customKey: categoryConfig.data.id,
          userId: categoryConfig.userId,
        }) as any
      );
      return (result as any).payload as Category;
    } catch (err) {
      setError("Failed to create category");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCollapse = async (id: string): Promise<Category> => {
    // stub: collapse toggle not wired yet
    return {
      type: DataType.Category,
      id,
      name: "",
      isCollapsed: false,
      order: 0,
    };
  };

  return {
    create,
    toggleCollapse,
    isLoading,
    error,
  };
};
