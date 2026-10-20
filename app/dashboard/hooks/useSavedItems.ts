import useSWR, { mutate } from "swr";
import { authFetcher } from "@/app/utils/client-auth";
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

async function authPost(url: string, body: any) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  return res.json();
}

export const useSavedItems = () => {
  const { user } = useUser();

  const { data, error, isLoading } = useSWR<{
    success: boolean;
    data: SavedItem[];
  }>(user ? "/api/store/saved-items" : null, authFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 300_000,
    keepPreviousData: true,
    revalidateIfStale: false,
  });

  const savedItems = data?.success ? data.data : [];

  const toggleSave = async (product: any) => {
    if (!user) return;
    const isSaved = savedItems.some((item) => item.id === product.id);
    const action = isSaved ? "remove" : "add";
    const result = await authPost("/api/store/saved-items", {
      product,
      action,
    });
    if (result.success) {
      mutate("/api/store/saved-items");
    }
  };

  const isSaved = (productId: string) =>
    savedItems.some((item) => item.id === productId);

  return { savedItems, isLoading, error, toggleSave, isSaved };
};
