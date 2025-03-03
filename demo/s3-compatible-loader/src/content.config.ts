import { defineCollection, z } from 'astro:content';
import { s3CompatibleLoader } from "@l4ph/s3-compatible-loader"

const blog = defineCollection({
	loader: s3CompatibleLoader({
		bucket: 'blog-obsidian',
		region: 'auto',
		endpoint: import.meta.env.CLOUDFLARE_R2_ENDPOINT,
		accessKeyId: import.meta.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
		secretAccessKey: import.meta.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
		forcePathStyle: false,
		markdownParse: true,
		imageReplace: true,
	}),
});

export const collections = { blog };
