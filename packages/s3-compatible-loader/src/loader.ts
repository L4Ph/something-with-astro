import { S3Client, ListObjectsV2Command, GetObjectCommand, type S3ClientConfig } from "@aws-sdk/client-s3";
import type { Loader } from 'astro/loaders';
import type { AstroConfig } from 'astro';
import type { Readable } from 'node:stream';
import { streamToString } from './utils';
import renderToString from './render';

export type S3CompatibleLoaderOptions = {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
  bucket: string;
  prefix?: string;
  forcePathStyle?: boolean;
  clientOptions?: Partial<S3ClientConfig>;
  markdownParse?: boolean;
  astroConfig?: AstroConfig;
}

export type ContentItem = {
  id: string;
  slug: string;
  content: string;
  collection?: string;
  fileUrl?: string;
  body?: string;
}

export function s3CompatibleLoader(options: S3CompatibleLoaderOptions): Loader {
  return {
    name: "s3-compatible-loader",
    load: async ({ store, logger, parseData, meta }) => {
      logger.info("Loading content from S3");
      
      const client = new S3Client({
        endpoint: options.endpoint,
        region: options.region || 'auto',
        credentials: {
          accessKeyId: options.accessKeyId,
          secretAccessKey: options.secretAccessKey,
        },
        forcePathStyle: options.forcePathStyle ?? true,
        ...options.clientOptions
      });

      // List objects from the bucket with the given prefix
      const listCommand = new ListObjectsV2Command({
        Bucket: options.bucket,
        Prefix: options.prefix || '',
      });

      try {
        // Clear the store before loading new content
        store.clear();
        
        const listResult = await client.send(listCommand);
        const contents = listResult.Contents || [];
        
        // Only process markdown files
        const markdownFiles = contents.filter(item => 
          item.Key && (item.Key.endsWith('.md') || item.Key.endsWith('.mdx'))
        );
        
        // Fetch each markdown file
        for (const file of markdownFiles) {
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
          
          const id = key;
          
          const contentItem = {
            id,
            slug,
            content,
            body: content, // Add body property for renderToString compatibility
            fileUrl: `s3://${options.bucket}/${key}`,
            collection: key.split('/')[0] || 'default',
          };

          // Parse the data before storing
          const data = await parseData({
            id,
            data: contentItem,
          });
          
          let html = data.content || "";
          
          // Use markdown parser if option is enabled
          if (options.markdownParse === true) {
            try {
              if (!options.astroConfig) {
                logger.warn("astroConfig is missing while markdownParse is true. Using default settings.");
              }
              
              // Create a pseudo DataEntry for renderToString
              const entry = {
                id: data.id,
                slug: data.slug,
                body: data.content,
                collection: data.collection || "",
                data: data,
              };
              
              const rendered = await renderToString(
                options.astroConfig || { markdown: {} } as AstroConfig, 
                entry
              );
              html = rendered.html;
              logger.debug(`Rendered HTML for ${id}`);
            } catch (error: unknown) {
              if (error instanceof Error) {
                logger.error(`Error rendering markdown for ${id}: ${error.message}`);
              }
            }
          }
          
          // Store the item
          store.set({
            id,
            data,
            rendered: {
              html,
            },
          });
        }
        
        logger.info(`Loaded ${markdownFiles.length} content items from S3`);
      } catch (error: unknown) {
        if (error instanceof Error) {
          logger.error(`Error loading content from S3: ${error.message}`);
          throw error;
        }
      }
    }
  };
}