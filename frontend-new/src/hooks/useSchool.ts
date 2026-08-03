import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { School } from '../types';

export function useSchool() {
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('schools')
          .select('*')
          .order('school_name')
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        setSchool(data as School);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load school');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { school, loading, error, schoolId: school?.id ?? null };
}
