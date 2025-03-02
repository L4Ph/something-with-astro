import type { AstroConfig } from 'astro';
import type { DataEntry } from "astro:content";
import { createMarkdownProcessor } from "@astrojs/markdown-remark";

export default async function renderToString(config: AstroConfig, entry: DataEntry) {
  const processor = await createMarkdownProcessor(config.markdown);
  const result = await processor.render(entry.body || '');
  return {
    html: result.code,
  }
}