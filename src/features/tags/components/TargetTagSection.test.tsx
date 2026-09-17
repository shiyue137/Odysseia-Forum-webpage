import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TargetTagSection } from "./TargetTagSection";
import { customTagsApi, type TargetTags } from "../api/customTagsApi";

const viewer = vi.hoisted(() => ({ id: "author", manager: false }));
vi.mock("@/features/auth/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: viewer.id }, isAuthenticated: true }) }));
vi.mock("../hooks/useTagRole", () => ({ useTagRole: () => ({ data: { is_management_member: viewer.manager }, isPending: false, isError: false }) }));
vi.mock("../api/customTagsApi", async (original) => {
  const real = await original<typeof import("../api/customTagsApi")>();
  return { ...real, customTagsApi: { target: vi.fn(), replace: vi.fn(), propose: vi.fn(), vote: vi.fn(), proposals: vi.fn() } };
});
vi.mock("./LiveTagPool", () => ({
  LiveTagPool: ({ onToggle }: { onToggle: (tag: { id: string; name: string }) => void }) =>
    <div><button onClick={() => onToggle({ id: "90071992547409931", name: "标签甲" })}>选择甲</button><button onClick={() => onToggle({ id: "90071992547409932", name: "标签乙" })}>选择乙</button></div>,
}));

const initial: TargetTags = { version: "v1", tags: [] };
const target = { type: "thread" as const, id: "1234567890123456789" };
const onSearch = vi.fn();
function mount(subject: { type: "thread" | "booklist"; id: string } = target, targetLabel?: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><TargetTagSection target={subject} targetLabel={targetLabel} ownerId="author" onSearch={onSearch} /></QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  viewer.id = "author";
  viewer.manager = false;
  vi.mocked(customTagsApi.target).mockResolvedValue(initial);
  vi.mocked(customTagsApi.proposals).mockResolvedValue([]);
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value() { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value() { this.removeAttribute("open"); } });
});

describe("帖子标签编辑", () => {
  it("申请记录优先展示已加载标签名称，未知名称明确保留 ID", async () => {
    vi.mocked(customTagsApi.proposals).mockResolvedValue(["7914", "9999"].map((id) => ({
      id, tag_id: id, tag_name: id === "7914" ? "兽耳" : "", status: "pending", reason: null, created_at: "2026-09-15T01:00:00Z", due_at: "2026-09-22T01:00:00Z", resolved_at: null,
    })));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(["custom-tags", "pool", ""], { pages: [[{ id: "7914", name: "兽耳" }]], pageParams: [0] });
    render(<QueryClientProvider client={client}><TargetTagSection target={target} ownerId="author" onSearch={onSearch} /></QueryClientProvider>);
    fireEvent.click(screen.getByRole("button", { name: "申请记录" }));
    expect(await screen.findByText("兽耳 · 待审核")).toBeInTheDocument();
    expect(screen.getByText("标签 #9999（名称未提供） · 待审核")).toBeInTheDocument();
  });
  it.each(["书单", "赛事"])("%s管理与提议统一使用 booklist 目标", async (label) => {
    const subject = { type: "booklist" as const, id: "77" };
    vi.mocked(customTagsApi.replace).mockResolvedValue({ version: "v2", tags: [] });
    mount(subject, label);
    await waitFor(() => expect(screen.getByRole("button", { name: "管理标签" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "管理标签" }));
    expect(await screen.findByRole("heading", { name: `管理${label}标签` })).toBeInTheDocument();
    expect(screen.queryByText(/原生标签/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "选择甲" }));
    fireEvent.click(screen.getByRole("button", { name: "保存标签" }));
    await waitFor(() => expect(customTagsApi.replace).toHaveBeenCalledWith(subject, "v1", ["90071992547409931"]));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "提议标签" }));
    expect(await screen.findByRole("heading", { name: `提议${label}标签` })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "选择甲" }));
    fireEvent.click(screen.getByRole("button", { name: "提交提议" }));
    await waitFor(() => expect(customTagsApi.propose).toHaveBeenCalledWith(subject, "90071992547409931"));
  });
  it("操作按钮独立分组，申请记录明确切换待审核与本人申请", async () => {
    viewer.manager = true;
    mount();
    const toolbar = screen.getByRole("group", { name: "标签操作" });
    fireEvent.click(within(toolbar).getByRole("button", { name: "申请记录" }));
    await waitFor(() => expect(customTagsApi.proposals).toHaveBeenCalledWith(target, true, 0));
    fireEvent.click(screen.getByRole("button", { name: "我的申请" }));
    await waitFor(() => expect(customTagsApi.proposals).toHaveBeenCalledWith(target, false, 0));
    expect(screen.queryByRole("checkbox", { name: "待审核队列" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "我的申请" })).toHaveAttribute("aria-pressed", "true");
  });
  it("管理组在他人帖子也可走申请流程，不调用直接替换", async () => {
    viewer.id = "manager";
    viewer.manager = true;
    mount();
    await waitFor(() => expect(screen.getByRole("button", { name: "管理标签" })).toBeEnabled());
    expect(screen.getByRole("button", { name: "提议标签" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "提议标签" }));
    fireEvent.click(await screen.findByRole("button", { name: "选择甲" }));
    fireEvent.click(screen.getByRole("button", { name: "提交提议" }));
    await waitFor(() => expect(customTagsApi.propose).toHaveBeenCalledWith(target, "90071992547409931"));
    expect(customTagsApi.replace).not.toHaveBeenCalled();
  });
  it("详情标签名称触发搜索，赞踩不触发搜索", async () => {
    const tag = { id: "7914", name: "兽耳", source: "custom" as const, discord_tag_id: null, category: 1, category_name: "癖好", enabled: true, deleted_at: null, binding_source: "local" as const, readonly: false as const, binding_id: "81", upvotes: 0, downvotes: 0, my_vote: 0 as const };
    vi.mocked(customTagsApi.target).mockResolvedValue({ version: "v1", tags: [tag] });
    vi.mocked(customTagsApi.vote).mockResolvedValue({ version: "v2", tags: [tag] });
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "搜索标签兽耳" }));
    expect(onSearch).toHaveBeenCalledWith(tag);
    onSearch.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "赞同标签兽耳" }));
    await waitFor(() => expect(customTagsApi.vote).toHaveBeenCalledWith(target, "81", 1));
    expect(onSearch).not.toHaveBeenCalled();
  });
  it("保留大整数 ID 与原版本，完整替换只提交用户选择", async () => {
    vi.mocked(customTagsApi.replace).mockResolvedValue({ version: "v2", tags: [] });
    mount();
    await waitFor(() => expect(screen.getByRole("button", { name: "管理标签" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "管理标签" }));
    fireEvent.click(await screen.findByRole("button", { name: "选择甲" }));
    fireEvent.click(screen.getByRole("button", { name: "保存标签" }));
    await waitFor(() => expect(customTagsApi.replace).toHaveBeenCalledWith(target, "v1", ["90071992547409931"]));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("版本冲突不自动重试，保留选择并要求核对最新集合", async () => {
    const error = new AxiosError("conflict", undefined, undefined, undefined, { status: 409, data: { detail: { code: "stale_version", message: "标签已变化" } } } as never);
    vi.mocked(customTagsApi.replace).mockRejectedValueOnce(error).mockResolvedValue({ version: "v3", tags: [] });
    mount();
    await waitFor(() => expect(screen.getByRole("button", { name: "管理标签" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "管理标签" }));
    fireEvent.click(await screen.findByRole("button", { name: "选择甲" }));
    vi.mocked(customTagsApi.target).mockResolvedValue({ version: "v2", tags: [] });
    fireEvent.click(screen.getByRole("button", { name: "保存标签" }));
    fireEvent.click(await screen.findByRole("button", { name: "已核对，以当前选择替换" }));
    expect(customTagsApi.replace).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "保存标签" }));
    await waitFor(() => expect(customTagsApi.replace).toHaveBeenLastCalledWith(target, "v2", ["90071992547409931"]));
  });

  it("普通用户部分提交失败后只保留失败项，重试不重复成功项", async () => {
    viewer.id = "reader";
    vi.mocked(customTagsApi.propose).mockImplementation(async (_target, id) => {
      if (id.endsWith("2")) throw new Error("停用");
      return { id: "1", tag_id: id, tag_name: "测试标签", status: "pending", reason: null, created_at: "", due_at: "", resolved_at: null };
    });
    mount();
    await waitFor(() => expect(screen.getByRole("button", { name: "提议标签" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "提议标签" }));
    fireEvent.click(await screen.findByRole("button", { name: "选择甲" }));
    fireEvent.click(screen.getByRole("button", { name: "选择乙" }));
    fireEvent.click(screen.getByRole("button", { name: "提交提议" }));
    expect(await screen.findByText("标签乙：停用")).toBeInTheDocument();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByRole("button", { name: "标签甲" })).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "标签乙" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "提交提议" }));
    await waitFor(() => expect(customTagsApi.propose).toHaveBeenCalledTimes(3));
    expect(customTagsApi.propose).toHaveBeenLastCalledWith(target, "90071992547409932");
  });

  it("选择弹层截断 Escape 冒泡，取消只关闭选择器", async () => {
    mount();
    await waitFor(() => expect(screen.getByRole("button", { name: "管理标签" })).toBeEnabled());
    const opener = screen.getByRole("button", { name: "管理标签" });
    opener.focus();
    fireEvent.click(opener);
    const dialog = await screen.findByRole("dialog");
    const outerEscape = vi.fn();
    window.addEventListener("keydown", outerEscape);
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(outerEscape).not.toHaveBeenCalled();
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    window.removeEventListener("keydown", outerEscape);
  });
});
