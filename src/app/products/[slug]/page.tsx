import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, ShieldCheck, Truck } from "lucide-react";
import {
  getFeaturedProducts,
  getProductBySlug,
  getRelatedProducts,
} from "@/lib/data/products";
import ProductCard from "@/components/product/product-card";
import ProductPurchasePanel from "@/components/product/product-purchase-panel";
import { finalPrice, formatPrice } from "@/lib/utils";
import { SITE } from "@/lib/constants";

type Params = Promise<{ slug: string }>;

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://biasbag.vn";

/**
 * ISR cho trang chi tiết sản phẩm.
 *
 * Kết hợp với `generateStaticParams` → các sản phẩm nổi bật được pre-render
 * lúc build, phần còn lại render on-demand rồi cache 5 phút. Admin sửa sản
 * phẩm → Server Action gọi `revalidatePath("/products")` để xoá cache.
 */
export const revalidate = 300;

/**
 * Pre-render sẵn các trang sản phẩm nổi bật.
 *
 * Mỗi URL sản phẩm được render tĩnh lúc build → người dùng nhận HTML
 * hoàn chỉnh ngay từ CDN, không phải chờ server gọi Supabase. Những sản
 * phẩm còn lại vẫn được render on-demand và cache theo `revalidate`.
 */
export async function generateStaticParams() {
  const products = await getFeaturedProducts(12);
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Không tìm thấy sản phẩm" };
  return {
    title: product.name,
    description: product.description ?? undefined,
    openGraph: {
      title: product.name,
      description: product.description ?? undefined,
      images: product.image_url ? [product.image_url] : undefined,
      type: "website",
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = await getRelatedProducts(product);
  const price = finalPrice(product.price, product.sale_price);
  const gallery = product.images?.length
    ? product.images
    : product.image_url
      ? [product.image_url]
      : [];

  // Payload rút gọn cho Client Component (ProductPurchasePanel).
  const cartItem = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    image: product.image_url,
    price: product.price,
    salePrice: product.sale_price,
    color: product.color,
    material: product.material,
    stock: product.stock,
    inStock: product.in_stock,
  };

  const specs = [
    { label: "Chất liệu", value: product.material },
    { label: "Màu sắc", value: product.color },
    { label: "Kích thước", value: product.size },
    { label: "Thương hiệu", value: product.brand },
  ].filter((s) => s.value);

  // --- JSON-LD: Product + BreadcrumbList (giúp Google hiển thị giá & tồn kho) ---
  const productUrl = `${BASE_URL}/products/${product.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": `${productUrl}#product`,
        name: product.name,
        description: product.description ?? undefined,
        image: gallery.length > 0 ? gallery : [SITE.logoOg],
        url: productUrl,
        sku: product.id,
        brand: {
          "@type": "Brand",
          name: product.brand ?? SITE.name,
        },
        category: product.category?.name ?? undefined,
        material: product.material ?? undefined,
        color: product.color ?? undefined,
        offers: {
          "@type": "Offer",
          url: productUrl,
          priceCurrency: SITE.currency,
          price: price,
          priceValidUntil: new Date(
            Date.now() + 365 * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .slice(0, 10),
          availability:
            product.in_stock && product.stock > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          itemCondition: "https://schema.org/NewCondition",
          seller: { "@type": "Organization", name: SITE.name },
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Trang chủ", item: BASE_URL },
          {
            "@type": "ListItem",
            position: 2,
            name: "Sản phẩm",
            item: `${BASE_URL}/products`,
          },
          ...(product.category
            ? [
                {
                  "@type": "ListItem",
                  position: 3,
                  name: product.category.name,
                  item: `${BASE_URL}/products?category=${product.category.slug}`,
                },
              ]
            : []),
          {
            "@type": "ListItem",
            position: product.category ? 4 : 3,
            name: product.name,
            item: productUrl,
          },
        ],
      },
    ],
  };

  return (
    <div className="container-page py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-ink-500">
        <Link href="/" className="hover:text-blush-700">
          Trang chủ
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/products" className="hover:text-blush-700">
          Sản phẩm
        </Link>
        {product.category && (
          <>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link
              href={`/products?category=${product.category.slug}`}
              className="hover:text-blush-700"
            >
              {product.category.name}
            </Link>
          </>
        )}
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-ink-800">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Gallery */}
        <div className="space-y-3">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-ink-100 bg-blush-50">
            {gallery[0] ? (
              <Image
                src={gallery[0]}
                alt={product.name}
                fill
                priority
                fetchPriority="high"
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-ink-400">
                Chưa có ảnh
              </div>
            )}
          </div>

          {gallery.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {gallery.slice(1, 5).map((img, i) => (
                <div
                  key={i}
                  className="relative aspect-square overflow-hidden rounded-xl border border-ink-100"
                >
                  <Image
                    src={img}
                    alt={`${product.name} - ảnh ${i + 2}`}
                    fill
                    sizes="150px"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          {product.category && (
            <Link
              href={`/products?category=${product.category.slug}`}
              className="eyebrow hover:underline"
            >
              {product.category.name}
            </Link>
          )}
          <h1 className="mt-2 font-display text-3xl font-bold leading-tight text-ink-900">
            {product.name}
          </h1>

          {/* Không hiển thị sao đánh giá / số lượt đánh giá — dữ liệu rating
              trong DB là dữ liệu mô phỏng, hiện ra không trung thực với
              người mua. */}
          <div className="mt-5 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-ink-900">
              {formatPrice(price)}
            </span>
          </div>

          <ProductPurchasePanel product={cartItem} />

          {/* Đặc điểm */}
          {product.features && product.features.length > 0 && (
            <div className="mt-8 border-t border-ink-100 pt-6">
              <h2 className="text-sm font-semibold text-ink-900">
                Đặc điểm sản phẩm
              </h2>
              <ul className="mt-3 space-y-2">
                {product.features.map((f) => (
                  <li key={f} className="flex gap-2.5 text-sm text-ink-600">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blush-400" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Thông số */}
          {specs.length > 0 && (
            <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-ink-100 pt-6 text-sm">
              {specs.map((s) => (
                <div key={s.label}>
                  <dt className="text-ink-500">{s.label}</dt>
                  <dd className="mt-0.5 font-medium text-ink-900">{s.value}</dd>
                </div>
              ))}
              <div>
                <dt className="text-ink-500">Tình trạng</dt>
                <dd className="mt-0.5 font-medium text-ink-900">
                  {product.in_stock
                    ? `Còn hàng (${product.stock})`
                    : "Tạm hết hàng"}
                </dd>
              </div>
            </dl>
          )}

          {/* Description */}
          {product.description && (
            <div className="mt-8 border-t border-ink-100 pt-6">
              <h2 className="text-sm font-semibold text-ink-900">
                Mô tả sản phẩm
              </h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-600">
                {product.description}
              </p>
            </div>
          )}

          {/* Guarantees */}
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="card flex items-start gap-3 p-4">
              <Truck className="h-5 w-5 shrink-0 text-blush-600" />
              <div>
                <p className="text-sm font-medium text-ink-900">
                  Giao hàng 2–5 ngày
                </p>
                <p className="text-xs text-ink-500">Miễn phí từ 300.000đ</p>
              </div>
            </div>
            <div className="card flex items-start gap-3 p-4">
              <ShieldCheck className="h-5 w-5 shrink-0 text-blush-600" />
              <div>
                <p className="text-sm font-medium text-ink-900">
                  Đổi trả trong 30 ngày
                </p>
                <p className="text-xs text-ink-500">Hoàn tiền trong 3–5 ngày</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-20 border-t border-ink-100 pt-12">
          <h2 className="section-title mb-6">Sản phẩm cùng dòng</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
