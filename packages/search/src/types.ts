/**
 * The unified shape of any record indexed in the search engine.
 */
export interface SearchDocument {
  /** A globally unique identifier (e.g., 'manuscript_123') */
  id: string;
  /** The type of record to allow for faceted filtering */
  type: 'manuscript' | 'event' | 'post';
  /** The primary language of the document */
  locale: 'en' | 'ar';
  /** The primary title or headline */
  title: string;
  /** A summarized excerpt or the full searchable text */
  content: string;
  /** The author's name, if applicable */
  author?: string;
  /** The absolute path to navigate to the resource */
  url: string;
  /** Unix timestamp for chronological sorting */
  publishedAt: number;
}
