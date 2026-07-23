import { generateOgImage } from '@/lib/ui/ogImage';
import { getPublishedValue } from '@/lib/executive/governedCapability';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

interface BlogPostValue {
  title: string;
}

function isBlogPostValue(value: unknown): value is BlogPostValue {
  return !!value && typeof value === 'object' && 'title' in value;
}

export default async function Image({ params }: { params: { slug: string } }) {
  const value = await getPublishedValue('blog', params.slug);
  const title = isBlogPostValue(value) ? value.title : 'Blog';
  return generateOgImage(title);
}
