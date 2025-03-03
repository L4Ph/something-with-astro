import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { S3CompatibleLoaderOptions } from "../loader";

/**
 * Process markdown content and replace local image references with signed S3 URLs
 */
export default async function replaceLocalImagesWithS3(content: string, s3Options: S3CompatibleLoaderOptions, client: S3Client): Promise<string> {
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

  // Process standard markdown image syntax: ![alt](path)
  const markdownImageRegex = /!\[(.*?)\]\(((?!https?:\/\/|\/\/)[^)]+)\)/g;
  const markdownMatches = Array.from(content.matchAll(markdownImageRegex));
  
  // Process Obsidian-style image syntax: ![[image.jpg]]
  const obsidianImageRegex = /!\[\[(.*?\.(?:jpg|jpeg|png|gif|svg|webp))\]\]/gi;
  const obsidianMatches = Array.from(content.matchAll(obsidianImageRegex));
  
  // Combine all matches for processing
  let replacements: Array<{original: string, path: string, replacement?: string, isObsidian?: boolean}> = [];
  
  // Add markdown matches
  for (const match of markdownMatches) {
    const [original, alt, imagePath] = match;
    if (!imagePath.startsWith('http://') && !imagePath.startsWith('https://')) {
      replacements.push({
        original,
        path: imagePath,
        isObsidian: false
      });
    }
  }
  
  // Add obsidian matches
  for (const match of obsidianMatches) {
    const [original, imagePath] = match;
    replacements.push({
      original,
      path: imagePath,
      isObsidian: true
    });
  }

  // Generate signed URLs for all matches
  for (const item of replacements) {
    // Remove leading ./ if present
    const cleanPath = item.path.startsWith('./') ? item.path.slice(2) : item.path;
    
    // Create S3 path with prefix
    const prefix = s3Options.prefix ? `${s3Options.prefix}/` : '';
    const key = `${prefix}${cleanPath}`;
    
    try {
      // Create command to get object
      const command = new GetObjectCommand({
        Bucket: s3Options.bucket,
        Key: key,
      });
      
      // Generate pre-signed URL (valid for 1 hour by default)
      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      
      if (item.isObsidian) {
        // Convert Obsidian format to standard markdown with empty alt text
        item.replacement = `![](${signedUrl})`;
      } else {
        // For standard markdown, preserve alt text
        const alt = item.original.match(/!\[(.*?)\]/)?.[1] || '';
        item.replacement = `![${alt}](${signedUrl})`;
      }
    } catch (error) {
      console.error(`Failed to generate signed URL for image: ${key}`, error);
      // Keep the original reference if URL generation fails
      item.replacement = item.original;
    }
  }
  
  // Apply all replacements to content
  let processedContent = content;
  for (const item of replacements) {
    if (item.replacement) {
      processedContent = processedContent.replace(item.original, item.replacement);
    }
  }
  
  return processedContent;
}