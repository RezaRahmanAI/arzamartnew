import type { Metadata } from 'next';
import { getCategoryBySlug } from '@/lib/data/categories';
import { categories as staticCategories } from '@/lib/shop-data';

interface Props {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category =
    (await getCategoryBySlug(slug)) ||
    staticCategories.find((c) => c.slug.toLowerCase() === slug.toLowerCase()) ||
    null;

  if (!category) {
    return {
      title: 'Category Not Found — Arza',
      description: 'Discover fashion collections at Arza with cash on delivery across Bangladesh.',
    };
  }

  const title = category.name + ' Collection — Arza';
  const description =
    category.blurb ||
    ('Explore our exclusive ' + category.name + ' collection. Cash on delivery available across Bangladesh.');
  const imageUrl = category.image;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: '/category/' + category.slug,
      images: imageUrl
        ? [
            {
              url: imageUrl,
              width: 800,
              height: 800,
              alt: category.name,
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

export default function CategoryLayout({ children }: Props) {
  return <>{children}</>;
}
