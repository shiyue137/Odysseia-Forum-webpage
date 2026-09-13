import { useMemo, useState } from 'react';
import { getUrlSafetyInfo, isTrustedDiscordHostname, parseHttpUrl } from '@/shared/lib/urlSafety';
import { ExternalLinkWarningDialog } from '@/shared/ui/ExternalLinkWarningDialog';

interface MarkdownTextProps {
  text: string;
  highlight?: string;
  className?: string;
  inline?: boolean;
  enableTables?: boolean;
}

interface PendingExternalLink {
  href: string;
  hostname: string;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildSafeAnchor(label: string, rawUrl: string): string {
  const parsedUrl = parseHttpUrl(decodeHtmlEntities(rawUrl));
  if (!parsedUrl) {
    return label;
  }

  const href = escapeHtmlAttribute(parsedUrl.toString());
  const faviconMarkup = isTrustedDiscordHostname(parsedUrl.hostname)
    ? '<span aria-hidden="true" class="link-favicon link-favicon-discord"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 0-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 0 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 0 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 1-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.082.082 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg></span>'
    : `<span aria-hidden="true" class="link-favicon" style="background-image:url('${escapeHtmlAttribute(`${parsedUrl.origin}/favicon.ico`)}')"></span>`;
  return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="discord-link">${faviconMarkup}${label}</a>`;
}

/**
 * Discord风格 Markdown 渲染：
 * - **bold** / *italic* / ***bold italic***
 * - __underline__ / ~~strikethrough~~
 * - ||spoiler||
 * - # / ## / ### 标题
 * - [label](url) 和自动链接识别
 * - `code`
 * - > 引用
 * - 换行 => <br/>
 */
function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function extractMarkdownTables(html: string): { html: string; tables: string[] } {
  const lines = html.split('\n');
  const tables: string[] = [];
  const output: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const header = splitTableRow(lines[index]);
    const divider = index + 1 < lines.length ? splitTableRow(lines[index + 1]) : [];
    const isTable = header.length > 1 && divider.length === header.length &&
      divider.every((cell) => /^:?-{3,}:?$/.test(cell));

    if (!isTable) {
      output.push(lines[index]);
      continue;
    }

    const rows: string[][] = [];
    index += 2;
    while (index < lines.length) {
      const row = splitTableRow(lines[index]);
      if (!lines[index].includes('|') || row.length !== header.length) break;
      rows.push(row);
      index += 1;
    }
    index -= 1;

    const token = `ODMARKDOWNTABLE${tables.length}TOKEN`;
    tables.push(
      `<div class="markdown-table-scroll"><table><thead><tr>${header.map((cell) => `<th>${cell}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`,
    );
    output.push(token);
  }

  return { html: output.join('\n'), tables };
}

function parseMarkdown(text: string, enableTables = false): string {
  if (!text) return '';

  const codeBlocks: string[] = [];
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  html = html.replace(/```[^\n`]*\n?([\s\S]*?)```/g, (_match, code: string) => {
    if (!code.trim()) return '';
    const token = `ODCODEBLOCK${codeBlocks.length}TOKEN`;
    codeBlocks.push(`<pre class="code-block"><code>${code.replace(/^\n|\n$/g, '')}</code></pre>`);
    return token;
  });

  html = html.replace(/\|\|(.+?)\|\|/g, '<span class="spoiler" data-spoiler="true">$1</span>');
  html = html.replace(/__(.*?)__/g, '<u>$1</u>');
  html = html.replace(/~~(.*?)~~/g, '<del>$1</del>');
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  html = html
    .replace(/^### (.*)$/gim, '<h3 class="discord-h3">$1</h3>')
    .replace(/^## (.*)$/gim, '<h2 class="discord-h2">$1</h2>')
    .replace(/^# (.*)$/gim, '<h1 class="discord-h1">$1</h1>');

  html = html.replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, (_match, label: string, url: string) => {
    return buildSafeAnchor(label, url);
  });

  html = html.replace(/(?<!href=")(https?:\/\/[^\s<]+)/g, (rawUrl: string) => {
    return buildSafeAnchor(rawUrl, rawUrl);
  });

  html = html.replace(/^> (.*)$/gim, '<blockquote class="discord-quote">$1</blockquote>');

  const extractedTables = enableTables
    ? extractMarkdownTables(html)
    : { html, tables: [] as string[] };
  html = extractedTables.html;
  html = html.replace(/\n/g, '<br />');

  for (const [index, table] of extractedTables.tables.entries()) {
    html = html.replace(new RegExp(escapeRegExp(`ODMARKDOWNTABLE${index}TOKEN`), 'g'), table);
  }

  for (const [index, block] of codeBlocks.entries()) {
    html = html.replace(new RegExp(escapeRegExp(`ODCODEBLOCK${index}TOKEN`), 'g'), block);
  }

  return html;
}

function highlightHtmlText(html: string, highlight: string): string {
  const keyword = highlight.trim();
  if (!keyword || typeof document === 'undefined') return html;

  const template = document.createElement('template');
  template.innerHTML = html;
  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);

  const pattern = new RegExp(`(${escapeRegExp(keyword)})`, 'gi');
  for (const textNode of textNodes) {
    if (textNode.parentElement?.closest('code, pre')) continue;
    const parts = textNode.data.split(pattern);
    if (parts.length === 1) continue;

    const fragment = document.createDocumentFragment();
    for (const part of parts) {
      if (part.toLowerCase() === keyword.toLowerCase()) {
        const mark = document.createElement('mark');
        mark.className = 'rounded bg-[#5865f2]/30 px-0.5 font-semibold text-[#00a8fc]';
        mark.textContent = part;
        fragment.append(mark);
      } else {
        fragment.append(document.createTextNode(part));
      }
    }
    textNode.replaceWith(fragment);
  }

  return template.innerHTML;
}

export function MarkdownText({
  text,
  highlight = '',
  className = '',
  inline = false,
  enableTables = false,
}: MarkdownTextProps) {
  const html = useMemo(
    () => highlightHtmlText(parseMarkdown(text, enableTables), highlight),
    [enableTables, highlight, text],
  );
  const rendersTable = enableTables && html.includes('markdown-table-scroll');
  const [pendingExternalLink, setPendingExternalLink] = useState<PendingExternalLink | null>(null);

  const handleClickCapture = (event: React.MouseEvent<HTMLElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    // Spoiler 点击揭示
    const spoiler = target.closest('[data-spoiler]');
    if (spoiler instanceof HTMLElement) {
      event.preventDefault();
      event.stopPropagation();
      spoiler.classList.toggle('revealed');
      return;
    }

    const anchor = target.closest('a');
    if (!(anchor instanceof HTMLAnchorElement)) return;

    const info = getUrlSafetyInfo(anchor.href);
    if (!info) {
      event.preventDefault();
      return;
    }

    if (!info.requiresExternalWarning) {
      return;
    }

    event.preventDefault();
    setPendingExternalLink({ href: info.href, hostname: info.hostname });
  };

  const handleConfirmExternalLink = () => {
    if (!pendingExternalLink) return;

    window.open(pendingExternalLink.href, '_blank', 'noopener,noreferrer');
    setPendingExternalLink(null);
  };

  return (
    <>
      <div
        className={`od-md min-w-0 max-w-full text-xs leading-relaxed text-(--od-text-secondary) [overflow-wrap:anywhere] [&_code]:break-all [&_pre]:max-w-full [&_pre]:overflow-x-auto sm:text-sm ${inline && !rendersTable ? 'inline' : ''} ${className}`}
        onClickCapture={handleClickCapture}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {pendingExternalLink && (
        <ExternalLinkWarningDialog
          hostname={pendingExternalLink.hostname}
          href={pendingExternalLink.href}
          onCancel={() => setPendingExternalLink(null)}
          onConfirm={handleConfirmExternalLink}
        />
      )}
    </>
  );
}
