// app/dashboard/hooks/useSavedItems.ts
import useSWR, { mutate } from "swr";
import { authFetcher, authPost } from "@/app/utils/client-auth";
import { useUser } from "./useProfile";

export interface SavedItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  brand?: string;
  description?: string;
  savedAt: number;
}

export const useSavedItems = () => {
  const { user } = useUser();

  const { data, error, isLoading } = useSWR<{
    success: boolean;
    data: SavedItem[];
  }>(user ? "/api/store/saved" : null, authFetcher, {
    revalidateOnFocus: false,
  });

  const savedItems = data?.success ? data.data : [];

  const toggleSave = async (product: any) => {
    if (!user) return;
    const isSaved = savedItems.some((item) => item.id === product.id);
    const method = isSaved ? "DELETE" : "POST";
    const result = await authPost("/api/store/saved", {
      product,
      action: isSaved ? "remove" : "add",
    });
    if (result.success) {
      // Revalidate
      mutate("/api/store/saved");
    }
  };

  const isSaved = (productId: string) =>
    savedItems.some((item) => item.id === productId);

  return {
    savedItems,
    isLoading,
    error,
    toggleSave,
    isSaved,
  };
};
