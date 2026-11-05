import type {Announcement} from './announcements';
import type {Subscriber} from './store';

const today = () => new Date().toISOString().slice(0, 10);

/** Still open for application (상시/미정 counts as open). */
export const isOpen = (a: Announcement, now = today()) => !a.applyEnd || a.applyEnd >= now;

/**
 * An announcement matches when it is open AND
 *  - region: nationwide, or overlaps the subscriber's regions
 *  - support type: overlaps (unclassified announcements are not sent)
 *  - industry: announcement is industry-agnostic, subscriber chose none, or they overlap
 */
export function matches(sub: Subscriber, a: Announcement, now = today()): boolean {
  if (!isOpen(a, now)) return false;
  const region = a.regions.includes('전국') || a.regions.some((r) => sub.regions.includes(r) || sub.regions.includes('전국'));
  const type = a.supportTypes.some((t) => sub.supportTypes.includes(t));
  const industry = !a.industries.length || !sub.industries.length || a.industries.some((i) => sub.industries.includes(i));
  return region && type && industry;
}

export const selectFor = (sub: Subscriber, all: Announcement[], now = today()) =>
  all.filter((a) => matches(sub, a, now)).sort((x, y) => (x.applyEnd ?? '9999').localeCompare(y.applyEnd ?? '9999'));
