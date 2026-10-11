// Search index shape — built on the server (lib/data/search-index.ts) and passed to the ⌘K palette.
export type SearchItem = {
  kind: 'Page' | 'Chart' | 'Tool';
  title: string;
  href: string;
  desc?: string;
  group?: string;
  keywords?: string;
  popular?: boolean;
};
