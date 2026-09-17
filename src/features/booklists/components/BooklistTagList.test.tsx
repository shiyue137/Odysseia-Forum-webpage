import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { expect, it, vi } from "vitest";
import type { Booklist } from "@/entities/booklist/types";
import { parseParams } from "@/features/search/hooks/useSearchParams";
import { BooklistTagList } from "./BooklistTagList";

vi.mock("@/shared/config/tags", () => ({ customTagsEnabled: true }));

function Location() {
  return <output aria-label="当前地址">{useLocation().search}</output>;
}

it.each([false, true])("标签搜索保留目标类型，点击不冒泡到卡片：赛事=%s", (isTournament) => {
  const onOpen = vi.fn();
  const booklist = { is_tournament: isTournament, custom_tags: [{ id: "90071992547409931", name: "兽耳" }] } as Booklist;
  render(<MemoryRouter><div onClick={onOpen}><BooklistTagList booklist={booklist} /></div><Location /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "兽耳" }));
  expect(onOpen).not.toHaveBeenCalled();
  const params = parseParams(new URLSearchParams(screen.getByLabelText("当前地址").textContent!));
  expect(params.type).toBe(isTournament ? "tournament" : "booklist");
  expect(params.includeTagIds).toEqual(["90071992547409931"]);
});

it("无标签不占位，超过四个显示剩余数量", () => {
  const { container, rerender } = render(<MemoryRouter><BooklistTagList booklist={{ custom_tags: [] } as unknown as Booklist} /></MemoryRouter>);
  expect(container).toBeEmptyDOMElement();
  rerender(<MemoryRouter><BooklistTagList booklist={{ custom_tags: Array.from({ length: 6 }, (_, i) => ({ id: String(i + 1), name: `标签${i}` })) } as Booklist} /></MemoryRouter>);
  expect(screen.getAllByRole("button")).toHaveLength(4);
  expect(screen.getByText("+2")).toBeInTheDocument();
});
