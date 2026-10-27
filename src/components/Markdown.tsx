import { marked } from "marked";
import clsx from "clsx";

marked.setOptions({ gfm: true, breaks: false });

// Content is authored in this repo, so rendering it as HTML is safe.
export function Markdown({ text, className }: { text: string; className?: string }) {
  const html = marked.parse(text, { async: false }) as string;
  return <div className={clsx("prose-oa text-[15px]", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}
