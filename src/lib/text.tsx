import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

const TOKEN = /(#[A-Za-z0-9_]{2,40}|@[A-Za-z0-9_]{2,32})/g;

/**
 * Renders Howl/echo text with clickable #hashtags and @mentions.
 */
export function LinkifiedText({ text }: { text: string }) {
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const token = m[0];
    const body = token.slice(1).toLowerCase();
    if (token.startsWith("#")) {
      out.push(
        <Link
          key={`${m.index}-h`}
          to="/hashtag/$tag"
          params={{ tag: body }}
          className="text-primary hover:underline"
        >
          {token}
        </Link>,
      );
    } else {
      out.push(
        <Link
          key={`${m.index}-m`}
          to="/u/$username"
          params={{ username: body }}
          className="text-secondary hover:underline"
        >
          {token}
        </Link>,
      );
    }
    last = m.index + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}

export function extractHashtags(text: string): string[] {
  const set = new Set<string>();
  for (const m of text.matchAll(/#([A-Za-z0-9_]{2,40})/g)) set.add(m[1].toLowerCase());
  return [...set];
}

export function extractMentions(text: string): string[] {
  const set = new Set<string>();
  for (const m of text.matchAll(/@([A-Za-z0-9_]{2,32})/g)) set.add(m[1].toLowerCase());
  return [...set];
}