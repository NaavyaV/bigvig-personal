import type { ReactNode } from 'react';

const LINK_RE = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

function trimTrailingPunctuation(raw: string): { url: string; trailing: string } {
  let url = raw;
  let trailing = '';
  while (/[.,;:!?)"'\]]$/.test(url)) {
    trailing = url.slice(-1) + trailing;
    url = url.slice(0, -1);
  }
  return { url, trailing };
}

function hrefFor(match: string): string {
  return /^https?:\/\//i.test(match) ? match : `https://${match}`;
}

/** Split plain text into nodes with clickable http(s)/www links. */
export function linkifyText(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  const re = new RegExp(LINK_RE.source, LINK_RE.flags);

  for (const match of text.matchAll(re)) {
    const index = match.index ?? 0;
    if (index > last) nodes.push(text.slice(last, index));

    const { url, trailing } = trimTrailingPunctuation(match[0]);
    if (url) {
      nodes.push(
        <a
          key={`link-${key++}`}
          href={hrefFor(url)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {url}
        </a>,
      );
    }
    if (trailing) nodes.push(trailing);
    last = index + match[0].length;
  }

  if (last < text.length) nodes.push(text.slice(last));
  return nodes.length > 0 ? nodes : [text];
}
