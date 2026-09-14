import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { AboutPage } from "./index";

vi.mock("@/shared/hooks/useSettledParallax", () => ({ useSettledParallax: () => () => {} }));
afterEach(() => vi.unstubAllGlobals());

function mount(client: QueryClient) {
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter><AboutPage /></MemoryRouter>
    </QueryClientProvider>,
  );
}

it("贡献者合并去重、过滤机器人并在返回页面时复用缓存", async () => {
  const person = { id: 1, login: "alice", contributions: 3, html_url: "https://github.com/alice", avatar_url: "https://example.com/a" };
  const request = vi.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify([person, { ...person, id: 2, login: "robot", type: "Bot" }])))
    .mockResolvedValueOnce(new Response(JSON.stringify([person])));
  vi.stubGlobal("fetch", request);
  const client = new QueryClient();
  const first = mount(client);
  expect(await screen.findByText("alice")).toBeInTheDocument();
  expect(screen.queryByText("robot")).not.toBeInTheDocument();
  expect(screen.getAllByText("alice")).toHaveLength(1);
  first.unmount();
  const second = mount(client);
  expect(await screen.findByText("alice")).toBeInTheDocument();
  expect(request).toHaveBeenCalledTimes(2);
  second.unmount();
  client.clear();
});

it.each([200, 403])("贡献者响应 %s 不会留下永久加载占位", async (status) => {
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => new Response("[]", { status })));
  const client = new QueryClient();
  const view = mount(client);
  expect(await screen.findByText(status === 200
    ? "暂时没有可展示的贡献者。"
    : "这会儿没把头像名单拉下来，点我去 GitHub 看完整贡献榜呀。")).toBeInTheDocument();
  view.unmount();
  client.clear();
});
