# S3 Compatible Content Loader for Astro

This package provides a content loader for Astro that fetches Markdown/MDX content from S3-compatible storage.

## Usage

### Basic Setup

Create a content collection that uses the S3 compatible loader:

```ts
// src/content/config.ts
import { defineCollection } from 'astro:content';
import { s3CompatibleLoader } from '@l4ph/s3-compatible-loader';

export const collections = {
  'blog': defineCollection({
    type: 'content',
    loader: s3CompatibleLoader({
      endpoint: 'https://your-s3-endpoint.com',
      accessKeyId: 'YOUR_ACCESS_KEY',
      secretAccessKey: 'YOUR_SECRET_KEY',
      bucket: 'your-bucket-name',
      prefix: 'blog/', // Optional prefix to filter content by folder
      region: 'us-east-1', // Optional, defaults to 'auto'
      forcePathStyle: true, // Optional, defaults to true,
      clientOptions: ''
    })
  })
};
```

### Environment Variables

For better security, use environment variables for your credentials:

```ts
// src/content/config.ts
import { defineCollection } from 'astro:content';
import { s3CompatibleLoader } from '@l4ph/s3-compatible-loader';

export const collections = {
  'blog': defineCollection({
    type: 'content',
    loader: s3CompatibleLoader({
      endpoint: import.meta.env.S3_ENDPOINT,
      accessKeyId: import.meta.env.S3_ACCESS_KEY,
      secretAccessKey: import.meta.env.S3_SECRET_KEY,
      bucket: import.meta.env.S3_BUCKET,
      prefix: 'blog/',
    })
  })
};
```

### Multiple Collections

You can use the loader for multiple collections by providing different prefixes:

```ts
// src/content/config.ts
import { defineCollection } from 'astro:content';
import { s3CompatibleLoader } from '@l4ph/s3-compatible-loader';

// Shared S3 configuration
const s3Config = {
  endpoint: import.meta.env.S3_ENDPOINT,
  accessKeyId: import.meta.env.S3_ACCESS_KEY,
  secretAccessKey: import.meta.env.S3_SECRET_KEY,
  bucket: import.meta.env.S3_BUCKET,
};

export const collections = {
  'blog': defineCollection({
    type: 'content',
    loader: s3CompatibleLoader({
      ...s3Config,
      prefix: 'blog/',
    })
  }),
  'docs': defineCollection({
    type: 'content',
    loader: s3CompatibleLoader({
      ...s3Config,
      prefix: 'docs/',
    })
  })
};
```

### Using Content in Components

Once configured, you can query and use the content like any other Astro content collection:

```astro
---
import { getCollection } from 'astro:content';

// Get all blog posts from S3
const blogPosts = await getCollection('blog');
---

<ul>
  {blogPosts.map(post => (
    <li>
      <a href={`/blog/${post.slug}`}>{post.data.title}</a>
    </li>
  ))}
</ul>
```

### Advanced S3 Client Configuration

You can pass additional S3 client options using the `clientOptions` parameter:

```ts
s3CompatibleLoader({
  endpoint: 'https://your-s3-endpoint.com',
  accessKeyId: 'YOUR_ACCESS_KEY',
  secretAccessKey: 'YOUR_SECRET_KEY',
  bucket: 'your-bucket-name',
  clientOptions: {
    maxAttempts: 3,
    retryMode: 'standard',
    // Any other options accepted by S3Client
  }
})
```

## Content Structure

The loader expects markdown files (`.md` or `.mdx`) stored in your S3 bucket. The content will be imported with the following structure:

- `id`: The S3 key of the file
- `slug`: Generated from the filename (without extension)
- `content`: The raw content of the file
- `collection`: The first part of the path (or 'default' if none)
- `fileUrl`: The S3 URL for the file

## License

MIT
