import { Preferences, DEFAULT_PREFERENCES } from '../types';

const STORAGE_KEY = 'lotus_meditation_preferences';
const SESSION_KEY = 'lotus_meditation_sessions';

export function loadPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_PREFERENCES, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load preferences:', e);
  }
  return { ...DEFAULT_PREFERENCES };
}

export function savePreferences(prefs: Partial<Preferences>): void {
  try {
    const current = loadPreferences();
    const merged = { ...current, ...prefs };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch (e) {
    console.warn('Failed to save preferences:', e);
  }
}

export interface SessionRecord {
  id: string;
  durationMinutes: number;
  completed: boolean;
  timestamp: number;
}

export function saveSession(record: Omit<SessionRecord, 'id' | 'timestamp'>): void {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    const sessions: SessionRecord[] = raw ? JSON.parse(raw) : [];
    sessions.push({
      ...record,
      id: crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
    });
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessions.slice(-100)));
  } catch (e) {
    console.warn('Failed to save session:', e);
  }
}

export function getRecentSessions(count: number = 10): SessionRecord[] {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const sessions: SessionRecord[] = JSON.parse(raw);
      return sessions.slice(-count).reverse();
    }
  } catch (e) {
    console.warn('Failed to get sessions:', e);
  }
  return [];
}
