// src/utils/image/imageTransform.ts
/**
 * Transform image URL to use Cloudflare Image Resizing via custom domain
 *
 * @param url - Original image URL (from R2)
 * @param width - Desired width (default: 200px for thumbnails)
 * @param quality - Image quality 1-100 (default: 50)
 * @param format - Output format (default: webp)
 * @returns Transformed URL with optimization parameters
 *
 * @example
 * // Original: https://pub-xxx.r2.dev/photos/image.jpg
 * // Result:   https://media.suekk.com/cdn-cgi/image/width=200,quality=50,format=webp/photos/image.jpg
 *
 * // In chat - show thumbnail
 * <img src={transformImageUrl(message.media_url, 200)} />
 *
 * // In lightbox - show full size
 * <img src={message.media_url} />
 */
export function transformImageUrl(
  url: string,
  width: number = 300,
  quality: number = 70,
  format: 'webp' | 'jpeg' | 'png' | 'auto' = 'webp'
): string {
  try {
    // ✅ Get custom domain from environment variable or use default
    const CUSTOM_DOMAIN = import.meta.env.VITE_MEDIA_DOMAIN || 'https://media.suekk.com';

    // Check if URL is from R2 storage
    if (url.includes('r2.dev') || url.includes('suekk.com')) {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;

      // ✅ Use custom domain with Cloudflare Image Resizing
      // Format: https://media.suekk.com/cdn-cgi/image/width=200,quality=50,format=webp/photos/xxx.jpg
      return `${CUSTOM_DOMAIN}/cdn-cgi/image/width=${width},quality=${quality},format=${format}${pathname}`;
    }

    // For other URLs, return as-is (no transformation available)
    return url;
  } catch (error) {
    console.error('[ImageTransform] Error transforming URL:', error);
    return url; // Return original URL if transformation fails
  }
}

/**
 * Get thumbnail URL for displaying in chat
 * @param url - Original image URL
 * @returns Optimized thumbnail URL
 */
export function getThumbnailUrl(url: string): string {
  return transformImageUrl(url, 200, 50, 'webp');
}

/**
 * Get preview URL for medium-size display
 * @param url - Original image URL
 * @returns Optimized preview URL
 */
export function getPreviewUrl(url: string): string {
  return transformImageUrl(url, 800, 80, 'webp');
}

/**
 * Get full-size URL for lightbox/download
 * @param url - Original image URL
 * @returns Original full-size URL
 */
export function getFullSizeUrl(url: string): string {
  return url; // Return original URL for full quality
}
