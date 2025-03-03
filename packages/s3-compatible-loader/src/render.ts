import type { AstroConfig } from 'astro';
import type { DataEntry } from "astro:content";
import { createMarkdownProcessor } from "@astrojs/markdown-remark";
import { S3Client } from "@aws-sdk/client-s3";
import type { S3CompatibleLoaderOptions } from './loader';
import replaceLocalImagesWithS3 from './utils/replace-local-image-with-s3';

export default async function renderToString(config: AstroConfig, entry: DataEntry, s3Options?: S3CompatibleLoaderOptions, client?: S3Client) {
  // If S3 options are provided, replace local image references
  let content = entry.body || '';
  
  if (s3Options) {
    // Create S3 client if not provided
    const s3Client = client || new S3Client({
      endpoint: s3Options.endpoint,
      region: s3Options.region || 'auto',
      credentials: {
        accessKeyId: s3Options.accessKeyId,
        secretAccessKey: s3Options.secretAccessKey,
      },
      forcePathStyle: s3Options.forcePathStyle ?? true,
      ...s3Options.clientOptions
    });
    
    if(s3Options.imageReplace) {
      content = await replaceLocalImagesWithS3(content, s3Options, s3Client);
    } else {
      content = entry.body || '';
    }
  }
  
  const processor = await createMarkdownProcessor(config.markdown);
  const result = await processor.render(content);

  console.log(result.code);
  
  return {
    html: result.code,
  }
}