import { useEffect, useState } from 'react';
import { schoolsAPI } from '../lib/api';

interface School {
  id: number;
  school_id: string;
  school_name: string;
  district: string;
  block: string;
  address: string;
  principal_name: string;
  contact_number: string;
  email: string;
  total_students: number;
  is_active: boolean;
}

export function useSchool() {
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
          setLoading(false);
          return;
        }

        const user = JSON.parse(userStr);

        if (user.role === 'SCHOOL' && user.school_id) {
          // School admin - get their school
          const response = await schoolsAPI.getById(user.school_id);
          setSchool(response.data);
        } else if (user.role === 'GOVERNMENT') {
          // Government admin - get first school for context
          const response = await schoolsAPI.getAll();
          setSchool(response.data[0] || null);
        }
      } catch (err) {
        console.error('Error fetching school:', err);
        setError(err instanceof Error ? err.message : 'Failed to load school');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { school, loading, error, schoolId: school?.id ?? null };
}
