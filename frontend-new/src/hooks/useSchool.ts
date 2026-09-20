import { useEffect, useState } from 'react';
import { schoolsAPI } from '../lib/api';

export interface SchoolContext {
  id: number;
  school_name: string;
  udise_code?: string;
  district?: string;
}

/**
 * The signed-in school, for headers and page context.
 *
 * Three things keep this off the network in the common case:
 *
 *  - `/auth/me` already returns the school, and Login stores it, so there is
 *    usually nothing to fetch at all.
 *  - the result is cached at module scope, so navigating between pages does
 *    not refetch. `<Layout>` mounts on every route, so without this every
 *    navigation cost a round trip.
 *  - concurrent callers share one in-flight request instead of each issuing
 *    their own.
 *
 * Government admins are not scoped to a school, so they never fetch: the old
 * version pulled the entire school list just to read one name that the header
 * does not even display for that role.
 */
let cached: SchoolContext | null = null;
let inFlight: Promise<SchoolContext | null> | null = null;

function readStoredUser(): { role?: string; school_id?: number | null; school?: SchoolContext } | null {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Drop the cache on logout, so the next sign-in does not inherit it. */
export function clearSchoolCache() {
  cached = null;
  inFlight = null;
}

async function loadSchool(): Promise<SchoolContext | null> {
  const user = readStoredUser();
  if (!user) return null;

  // Government admins have no single school.
  if (user.role !== 'SCHOOL' || !user.school_id) return null;

  // Stored by Login from the /auth/me response - no request needed.
  if (user.school?.id) return user.school;

  const response = await schoolsAPI.getById(user.school_id);
  return response.data ?? null;
}

export function useSchool() {
  const [school, setSchool] = useState<SchoolContext | null>(cached);
  const [loading, setLoading] = useState(cached === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (cached) {
      setSchool(cached);
      setLoading(false);
      return;
    }

    // Share one request between every component that mounts this hook.
    inFlight ??= loadSchool();

    inFlight
      .then((result) => {
        cached = result;
        if (active) setSchool(result);
      })
      .catch((err: unknown) => {
        inFlight = null; // let a later mount retry
        if (active) setError(err instanceof Error ? err.message : 'Failed to load school');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { school, loading, error, schoolId: school?.id ?? null };
}
