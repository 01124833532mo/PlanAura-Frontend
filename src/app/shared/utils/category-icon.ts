/**
 * Fallback Material Symbols per category slug, used only when a category has
 * no iconUrl of its own. Shared between the homepage category carousel and
 * the Explore Services catalog page so both render identical fallback tiles.
 */
const CATEGORY_ICON_FALLBACKS: Record<string, string> = {
  venue: 'location_city',
  venues: 'location_city',
  catering: 'restaurant',
  caterer: 'restaurant',
  photography: 'photo_camera',
  photographer: 'photo_camera',
  videography: 'videocam',
  decor: 'local_florist',
  decoration: 'local_florist',
  florist: 'local_florist',
  music: 'music_note',
  entertainment: 'music_note',
  dj: 'music_note',
  makeup: 'face_retouching_natural',
  beauty: 'face_retouching_natural',
  planning: 'event_available',
  'event-planning': 'event_available',
  cake: 'cake',
  bakery: 'cake',
  transportation: 'directions_car',
  transport: 'directions_car',
};

const DEFAULT_CATEGORY_ICON = 'celebration';

export function categoryIconFor(slug: string): string {
  return CATEGORY_ICON_FALLBACKS[slug.toLowerCase()] ?? DEFAULT_CATEGORY_ICON;
}
