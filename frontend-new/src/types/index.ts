export interface School {
  id: number;
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
  is_active?: boolean;
  has_admin?: boolean;
  admin_name?: string | null;
  admin_employee_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: number;
  student_id: string;
  school_id: number;
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
  photo_path: string | null;
  has_photo?: boolean;  // Indicates if photo is stored
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: number;
  school_id: number;
  item_name: string;
  quantity: number;
  unit: string;
  threshold: number;
  last_updated: string;
}

export interface Alert {
  id: number;
  school_id: number;
  alert_type: string;
  message: string;
  status: string;
  created_at: string;
}

export interface DailyMeal {
  id: number;
  school_id: number;
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

export type InventoryInput = Omit<InventoryItem, 'id' | 'last_updated' | 'school_id'> & {
  school_id?: string;
};

export type SchoolInput = Omit<School, 'id' | 'created_at' | 'updated_at'>;
