import { generateOgImage } from '@/lib/ui/ogImage';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return generateOgImage('You\u2019re not disorganised. You\u2019re just carrying too much.');
}
