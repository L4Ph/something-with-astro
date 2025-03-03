import type { S3CompatibleLoaderOptions } from "../loader";

/**
 * Process markdown content and replace local image references with S3 URLs
 */
export default function replaceLocalImagesWithS3(content: string, s3Options: S3CompatibleLoaderOptions): string {
  // Process standard markdown image syntax: ![alt](path)
  const markdownImageRegex = /!\[(.*?)\]\(((?!https?:\/\/|\/\/)[^)]+)\)/g;
  
  let processedContent = content.replace(markdownImageRegex, (match, alt, imagePath) => {
    // Only transform relative paths that don't start with http/https
    if (!imagePath.startsWith('http://') && !imagePath.startsWith('https://')) {
      // Remove leading ./ if present
      const cleanPath = imagePath.startsWith('./') ? imagePath.slice(2) : imagePath;
      
      // Create S3 URL
      const prefix = s3Options.prefix ? `${s3Options.prefix}/` : '';
      const s3ImagePath = `${s3Options.endpoint}/${s3Options.bucket}/${prefix}${cleanPath}`;
      console.log(s3ImagePath);
      return `![${alt}](${s3ImagePath})`;
    }
    
    // Return the original image reference if it's already an absolute URL
    return match;
  });
  
  // Also process Obsidian-style image syntax: ![[image.jpg]]
  const obsidianImageRegex = /!\[\[(.*?\.(?:jpg|jpeg|png|gif|svg|webp))\]\]/gi;
  
  processedContent = processedContent.replace(obsidianImageRegex, (match, imagePath) => {
    // Create S3 URL
    const cleanPath = imagePath.startsWith('./') ? imagePath.slice(2) : imagePath;
    const prefix = s3Options.prefix ? `${s3Options.prefix}/` : '';
    const s3ImagePath = `${s3Options.endpoint}/${s3Options.bucket}/${prefix}${cleanPath}`;
    console.log(s3ImagePath)
    // Convert to standard markdown image syntax with empty alt text
    return `![](${s3ImagePath})`;
  });
  
  return processedContent;
}