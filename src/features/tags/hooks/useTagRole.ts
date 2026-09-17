import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { customTagsEnabled } from "@/shared/config/tags";
import { customTagsApi } from "../api/customTagsApi";

export function useTagRole() {
  const { user, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["custom-tags", "role", user?.id],
    queryFn: customTagsApi.role,
    enabled: customTagsEnabled && isAuthenticated,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
}
