import type { AstroConfig } from 'astro';
import type { DataEntry } from "astro:content";
import { createMarkdownProcessor } from "@astrojs/markdown-remark";
import type { S3CompatibleLoaderOptions } from './loader';
import replaceLocalImagesWithS3 from './utils/replace-local-image-with-s3';

export default async function renderToString(config: AstroConfig, entry: DataEntry, s3Options?: S3CompatibleLoaderOptions) {
  // If S3 options are provided, replace local image references
  let contentWithS3Images = entry.body || '';
  
  if (s3Options?.imageReplace) {
    contentWithS3Images = replaceLocalImagesWithS3(contentWithS3Images, s3Options);
  }
  
  const processor = await createMarkdownProcessor(config.markdown);
  const result = await processor.render(contentWithS3Images);
  
  return {
    html: result.code,
  }
}