export interface School {
  id: string;
  udise_code: string;
  school_name: string;
  district: string;
  taluk: string;
  village: string;
  address: string | null;
  pin_code: string | null;
  principal_name: string | null;
  principal_phone: string | null;
  email: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  student_id: string;
  school_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender: string | null;
  grade: string | null;
  section: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  has_allergies: boolean;
  dietary_preferences: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  school_id: string;
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  threshold: number;
  supplier: string | null;
  cost_per_unit: number | null;
  last_updated: string;
  created_at: string;
}

export interface Alert {
  id: string;
  school_id: string;
  alert_type: string;
  message: string;
  status: string;
  created_at: string;
}

export interface DailyMeal {
  id: string;
  school_id: string;
  date: string;
  total_students_present: number;
  rice_consumed: number;
  wheat_consumed: number;
  dal_consumed: number;
  created_at: string;
}

export type StudentInput = Omit<Student, 'id' | 'created_at' | 'updated_at' | 'school_id'> & {
  school_id?: string;
};

export type InventoryInput = Omit<InventoryItem, 'id' | 'last_updated' | 'created_at' | 'school_id'> & {
  school_id?: string;
};

export type SchoolInput = Omit<School, 'id' | 'created_at' | 'updated_at'>;
