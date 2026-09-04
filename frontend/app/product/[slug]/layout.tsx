import type { Metadata } from 'next';
import { getProductBySlug } from '@/lib/data/products';
import { products as staticProducts } from '@/lib/shop-data';

interface Props {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product =
    (await getProductBySlug(slug)) ||
    staticProducts.find((p) => p.slug.toLowerCase() === slug.toLowerCase()) ||
    null;

  if (!product) {
    return {
      title: 'Product Not Found — Arza',
      description: 'Discover quality fashion at Arza with cash on delivery across Bangladesh.',
    };
  }

  const title = product.name + ' — Arza';
  const description =
    product.description?.slice(0, 160) ||
    (product.name + ' available at Arza for BDT ' + product.price + '. Cash on delivery nationwide.');
  const imageUrl = product.image;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: '/product/' + product.slug,
      images: imageUrl
        ? [
            {
              url: imageUrl,
              width: 800,
              height: 800,
              alt: product.name,
            },
          ]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: imageUrl ? [imageUrl] : [],
    },
  };
}

export default function ProductLayout({ children }: Props) {
  return <>{children}</>;
}
