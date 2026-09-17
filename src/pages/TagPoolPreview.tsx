import { useState } from "react";
import { ThemeProvider } from "@/app/themes/ThemeProvider";
import { TagPoolBrowser, type PoolTag } from "@/features/tags/components/TagPoolBrowser";
import { Checkbox } from "@/shared/ui/Checkbox";

const categories = ["癖好", "作品", "角色", "特质", "情节", "背景", "玩法"];
const tag = (id: string, name: string, category: string, parents: string[] = [], aliases: string[] = [], excludes: string[] = []): PoolTag =>
  ({ id, name, category, parents, aliases, excludes, enabled: true });
const samples: PoolTag[] = [
  tag("modern", "现代背景", "背景"),
  tag("campus", "校园背景", "背景", ["modern"], ["校园", "School"]),
  tag("university", "大学校园", "背景", ["campus"]),
  tag("work", "都市职场", "背景", ["modern"], ["办公室"]),
  tag("fantasy", "幻想背景", "背景"),
  tag("magic", "魔法学院", "背景", ["fantasy", "campus"], ["魔法学校"]),
  tag("space", "太空探索", "背景", [], ["星际", "Space"]),
  tag("alice", "爱丽丝(蔚蓝档案)", "角色", [], ["Alice", "アリス"]),
  tag("detective", "侦探", "角色"),
  tag("ba", "蔚蓝档案", "作品", [], ["Blue Archive", "BA"]),
  tag("gentle", "温柔", "特质"),
  tag("adventure", "冒险", "情节"),
  tag("mystery", "悬疑推理", "情节"),
  tag("single", "单人叙事", "玩法", [], [], ["multi"]),
  tag("multi", "多人互动", "玩法", [], [], ["single"]),
  { ...tag("long", "在遥远星系的空间站中展开的多角色长期生存模拟", "玩法"), enabled: false },
];

export function TagPoolPreview() {
  const [tags, setTags] = useState(samples);
  const [admin, setAdmin] = useState(false);
  const [empty, setEmpty] = useState(false);
  return (
    <ThemeProvider>
      <div className="relative min-h-dvh bg-(--od-bg) text-(--od-text-primary)">
        <div className="flex min-h-12 flex-wrap items-center justify-between gap-x-5 gap-y-2 border-b border-(--od-border) px-4 py-2 text-xs text-(--od-text-secondary)">
          <span>DEV · 标签池草稿 · 关系与数据均为示例</span>
          <div className="flex flex-wrap gap-4">
            <Checkbox className="min-h-8" checked={admin} onChange={(event) => setAdmin(event.target.checked)} label="管理员" />
            <Checkbox className="min-h-8" checked={empty} onChange={(event) => setEmpty(event.target.checked)} label="空数据" />
            <button type="button" onClick={() => setTags(samples)} className="min-h-8 underline">重置样例</button>
          </div>
        </div>
        <TagPoolBrowser key={`${admin}-${empty}`} tags={empty ? [] : tags} categories={categories} canManage={admin}
          onSave={(saved) => setTags((current) => saved.id ? current.map((item) => item.id === saved.id ? saved : item) : [...current, { ...saved, id: crypto.randomUUID() }])} />
      </div>
    </ThemeProvider>
  );
}
