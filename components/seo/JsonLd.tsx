// Structured data as a plain <script type="application/ld+json"> (the Next.js JSON-LD guide). `<` is escaped so a
// string in the data can never close the script tag.
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}
