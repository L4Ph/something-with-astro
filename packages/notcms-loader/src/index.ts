import ky, { HTTPError } from 'ky';
import type { Loader } from 'astro/loaders';
import type { AstroIntegrationLogger } from 'astro'; // Keep for potential direct use if needed outside load

// Define the structure of the NotCMS page data (adjust as needed based on actual API response)
export interface NotCMSPage {
  id: string; // Assuming NotCMS provides a unique ID
  slug: string; // Assuming NotCMS provides a slug or we derive it
  title: string;
  content: string; // Or a more complex structure
  // Add other relevant fields from NotCMS API
  [key: string]: unknown; // Allow arbitrary data, prefer unknown over any
}

export interface NotCMSLoaderOptions {
  workspaceId: string;
  databaseId: string;
  apiKey: string;
  apiUrl?: string; // Optional: Allow overriding the default API URL
  // Add any other options needed for parsing or handling data
}

// Define the structure of the data stored by the loader
// This often includes the original data and potentially rendered output
interface StoredData {
  id: string;
  data: NotCMSPage; // The raw page data from NotCMS
  rendered?: {
    html?: string; // Placeholder for potential future rendering
  };
}

export function notcmsLoader(options: NotCMSLoaderOptions): Loader {
  return {
    name: 'notcms-loader',
    load: async ({ store, logger, parseData }) => {
      const { workspaceId, databaseId, apiKey, apiUrl = 'https://api.notcms.com' } = options;

      if (!workspaceId || !databaseId || !apiKey) {
        logger.error('Missing required options: workspaceId, databaseId, or apiKey.');
        throw new Error('NotCMS Loader configuration error.');
      }

      const endpoint = `${apiUrl}/v1/ws/${workspaceId}/db/${databaseId}/pages`;

      logger.info(`Fetching pages from NotCMS: ${endpoint}`);

      try {
        // Assuming the API returns an object with a 'data' property containing the array of pages
        // Adjust the expected response structure if needed
        const response = await ky.get(endpoint, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }).json<{ data: NotCMSPage[] }>(); // Adjust type based on actual API response structure

        logger.info(`Successfully fetched ${response.data.length} pages from NotCMS.`);

        // Clear the store before loading new content
        store.clear();

        // Process and store each page
        for (const page of response.data) {
          // Ensure the page has an 'id' and 'slug'. Adapt if needed.
          if (!page.id) {
            logger.warn(`Page missing 'id', skipping: ${JSON.stringify(page).substring(0, 100)}...`);
            continue;
          }
          // If slug is missing, try to derive it or use id. Adjust as necessary.
          const slug = page.slug || page.id;
          const id = page.id; // Use the NotCMS ID as the store ID

          const pageData: NotCMSPage = {
            ...page,
            slug: slug, // Ensure slug is set
          };

          // Allow external parsing/transformation
          const parsedData = await parseData({
            id: id,
            data: pageData,
          });

          // Store the item
          store.set({
            id: id,
            data: parsedData, // Store the potentially transformed data
            rendered: {
              // Add rendered content here if applicable (e.g., markdown to HTML)
              // For now, it's empty or could hold raw content if needed elsewhere
              html: '', // Or potentially parsedData.content if it's already HTML
            },
          });
        }

        logger.info(`Stored ${response.data.length} content items from NotCMS.`);

      } catch (error) {
        logger.error('Failed to fetch or process pages from NotCMS.');
        if (error instanceof HTTPError) {
          try {
            const responseBody = await error.response.text();
            logger.error(`HTTP Error: ${error.message}`);
            logger.error(`Response status: ${error.response.status}`);
            logger.error(`Response body: ${responseBody}`);
          } catch (readError) {
            logger.error('Failed to read error response body.');
          }
        } else if (error instanceof Error) {
          logger.error(`Error: ${error.message}`);
        } else {
          logger.error(`An unknown error occurred: ${String(error)}`);
        }
        // Re-throw the error to signal failure
        throw new Error('Failed to load data from NotCMS.');
      }
    },
  };
}