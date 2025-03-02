import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import type { AstroIntegration } from 'astro';
import type { Readable } from 'node:stream';
import { streamToString } from './utils';

export interface S3CompatibleLoaderOptions {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
  bucket: string;
  prefix?: string;
  forcePathStyle?: boolean;
}

export interface ContentItem {
  id: string;
  slug: string;
  content: string;
  collection?: string;
  fileUrl?: string;
}

export async function s3CompatibleLoader(options: S3CompatibleLoaderOptions): Promise<ContentItem[]> {
  const client = new S3Client({
    endpoint: options.endpoint,
    region: options.region || 'auto',
    credentials: {
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
    },
    forcePathStyle: options.forcePathStyle ?? true,
  });

  // List objects from the bucket with the given prefix
  const listCommand = new ListObjectsV2Command({
    Bucket: options.bucket,
    Prefix: options.prefix || '',
  });

  try {
    const listResult = await client.send(listCommand);
    const contents = listResult.Contents || [];
    
    // Only process markdown files
    const markdownFiles = contents.filter(item => 
      item.Key && (item.Key.endsWith('.md') || item.Key.endsWith('.mdx'))
    );
    
    // Fetch each markdown file
    const contentItems = await Promise.all(
      markdownFiles.map(async file => {
        const key = file.Key as string;
        const getCommand = new GetObjectCommand({
          Bucket: options.bucket,
          Key: key,
        });
        
        const response = await client.send(getCommand);
        const content = await streamToString(response.Body as Readable);
        
        // Generate slug from filename
        const filename = key.split('/').pop() || '';
        const slug = filename.replace(/\.mdx?$/, '');
        
        return {
          id: key,
          slug,
          content,
          fileUrl: `s3://${options.bucket}/${key}`,
          collection: key.split('/')[0] || 'default',
        };
      })
    );
    
    return contentItems;
  } catch (error) {
    console.error('Error loading content from S3:', error);
    throw error;
  }
}