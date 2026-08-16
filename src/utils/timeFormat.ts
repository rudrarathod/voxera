export function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString; // Fallback to original string if invalid

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.max(0, Math.floor(diffMs / 1000));
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);

    if (diffSec < 60) {
      return 'Just now';
    }
    if (diffMin < 60) {
      return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
    }
    if (diffHour < 24) {
      return `${diffHour} ${diffHour === 1 ? 'hour' : 'hours'} ago`;
    }

    // Check if yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    // Format as localized date (e.g., Aug 12, 2026)
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return isoString;
  }
}

export function isWithinPeriod(
  isoString: string,
  period: 'All' | 'Today' | 'This week' | 'This month'
): boolean {
  if (period === 'All') return true;

  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      // Fallback for legacy items that might contain text
      if (isoString.includes('Just now') || isoString.includes('minute') || isoString.includes('hour')) {
        return period === 'Today' || period === 'This week' || period === 'This month';
      }
      return true;
    }

    const now = new Date();

    if (period === 'Today') {
      // Same calendar day
      return date.toDateString() === now.toDateString();
    }

    if (period === 'This week') {
      // Last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      return date >= sevenDaysAgo;
    }

    if (period === 'This month') {
      // Last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      return date >= thirtyDaysAgo;
    }

    return true;
  } catch (error) {
    console.error('Error checking date period:', error);
    return true;
  }
}
