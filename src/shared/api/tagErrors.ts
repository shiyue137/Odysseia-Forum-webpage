import { isAxiosError } from "axios";

export function isTagsChangedError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 409 &&
    error.response.data?.detail?.code === "tags_changed";
}
