/**
 * Component nhúng JSON-LD (schema.org) vào trang.
 *
 * Dùng thay vì tự viết `<script type="application/ld+json">` ở mỗi trang →
 * một chỗ duy nhất, dễ kiểm tra, không sót trang nào.
 *
 * ```tsx
 * <JsonLd data={{ "@context": "https://schema.org", "@type": "WebPage", ... }} />
 * ```
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger -- JSON-LD không chứa HTML
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/**
 * JSON-LD `BreadcrumbList` dùng chung cho các trang con.
 *
 * @param items danh sách `{ name, url }` theo thứ tự từ gốc tới trang hiện tại.
 */
export function breadcrumbJsonLd(
  items: { name: string; url: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
