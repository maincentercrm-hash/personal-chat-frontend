import { describe, it, expect } from 'vitest';
import { formatLastSeen, formatLastSeenShort, parseLastSeen } from './formatLastSeen';

describe('formatLastSeen', () => {
  it('should return "Offline" for null', () => {
    expect(formatLastSeen(null)).toBe('Offline');
  });

  it('should return "Offline" for undefined', () => {
    expect(formatLastSeen(undefined)).toBe('Offline');
  });

  it('should return "Active now" for current time', () => {
    const now = new Date();
    expect(formatLastSeen(now)).toBe('Active now');
  });

  it('should return "Active now" for time less than 1 minute ago', () => {
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
    expect(formatLastSeen(thirtySecondsAgo)).toBe('Active now');
  });

  it('should return "Active Xm ago" for minutes', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(formatLastSeen(fiveMinutesAgo)).toBe('Active 5m ago');

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    expect(formatLastSeen(thirtyMinutesAgo)).toBe('Active 30m ago');
  });

  it('should return "Active Xh ago" for hours', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(formatLastSeen(twoHoursAgo)).toBe('Active 2h ago');

    const tenHoursAgo = new Date(Date.now() - 10 * 60 * 60 * 1000);
    expect(formatLastSeen(tenHoursAgo)).toBe('Active 10h ago');
  });

  it('should return "Active yesterday" for 1 day ago', () => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(formatLastSeen(oneDayAgo)).toBe('Active yesterday');
  });

  it('should return "Active Xd ago" for days (2-6)', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    expect(formatLastSeen(threeDaysAgo)).toBe('Active 3d ago');

    const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
    expect(formatLastSeen(sixDaysAgo)).toBe('Active 6d ago');
  });

  it('should return "Last seen Month Day" for more than a week', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const result = formatLastSeen(tenDaysAgo);
    expect(result).toContain('Last seen');
  });

  it('should handle future dates gracefully', () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60);
    expect(formatLastSeen(futureDate)).toBe('Active now');
  });
});

describe('formatLastSeenShort', () => {
  it('should return "Off" for null/undefined', () => {
    expect(formatLastSeenShort(null)).toBe('Off');
    expect(formatLastSeenShort(undefined)).toBe('Off');
  });

  it('should return "Now" for current time', () => {
    const now = new Date();
    expect(formatLastSeenShort(now)).toBe('Now');
  });

  it('should return "Xm" for minutes', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(formatLastSeenShort(fiveMinutesAgo)).toBe('5m');
  });

  it('should return "Xh" for hours', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(formatLastSeenShort(twoHoursAgo)).toBe('2h');
  });

  it('should return "Xd" for days', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    expect(formatLastSeenShort(threeDaysAgo)).toBe('3d');
  });

  it('should return "Xw" for weeks', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    expect(formatLastSeenShort(tenDaysAgo)).toBe('1w');
  });
});

describe('parseLastSeen', () => {
  it('should return null for null/undefined', () => {
    expect(parseLastSeen(null)).toBe(null);
    expect(parseLastSeen(undefined)).toBe(null);
  });

  it('should return Date object for valid Date input', () => {
    const date = new Date();
    expect(parseLastSeen(date)).toEqual(date);
  });

  it('should parse ISO 8601 string', () => {
    const isoString = '2025-01-30T10:30:00Z';
    const result = parseLastSeen(isoString);
    expect(result).toBeInstanceOf(Date);
    expect(result?.toISOString()).toBe(isoString);
  });

  it('should return null for invalid date string', () => {
    expect(parseLastSeen('invalid-date')).toBe(null);
  });

  it('should handle various date formats', () => {
    const dateStr = '2025-01-30';
    const result = parseLastSeen(dateStr);
    expect(result).toBeInstanceOf(Date);
  });
});
