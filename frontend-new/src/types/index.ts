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
  photo_path: string | null; // DEPRECATED - legacy local path
  photo_url: string | null; // S3 URL or /uploads/... path
  has_photo?: boolean;
  /** True once the camera can actually recognise this student. */
  has_face_encoding?: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: number;
  school_id: number;
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  threshold: number;
  supplier?: string | null;
  cost_per_unit?: number | null;
  last_updated: string;
}

export interface InventorySummary {
  total_items: number;
  total_stock_value: number;
  low_stock_count: number;
  out_of_stock_count: number;
  low_stock_items: Array<{
    id: number;
    item_name: string;
    quantity: number;
    threshold: number;
    unit: string;
  }>;
  by_category: Array<{
    category: string;
    items: number;
    quantity: number;
    value: number;
  }>;
}

export interface Alert {
  id: number;
  school_id: number;
  alert_type: string;
  message: string;
  severity: string;
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
  inventory_consumed: boolean;
  created_at: string;
}

export interface AttendanceRecord {
  id: number;
  student_id: string;
  student_db_id: number;
  student_name: string;
  grade: string | null;
  section: string | null;
  date: string;
  time: string | null;
  status: string;
  confidence_score: number | null;
  photo_url?: string | null;
}

export interface AttendanceStatistics {
  date: string;
  total_students: number;
  present: number;
  absent: number;
  attendance_percentage: number;
}

/** One face found in a camera frame, as returned by /attendance/detect-faces. */
export interface DetectedFace {
  bbox: number[];
  detection_confidence: number;
  quality: number;
  matched: boolean;
  student: {
    id: number;
    student_id: string;
    name: string;
    grade: string | null;
    section: string | null;
    photo_url?: string | null;
  } | null;
  match_confidence: number;
  already_marked: boolean;
  /** Clears the confidence and quality bars and is not yet marked today. */
  markable: boolean;
}

export interface MarkedStudent {
  attendance_id: number;
  student: NonNullable<DetectedFace['student']>;
  confidence_score: number;
  time: string;
}

export interface SkippedFace {
  reason:
    | 'low_quality'
    | 'not_recognised'
    | 'low_confidence'
    | 'different_student'
    | 'duplicate_in_frame'
    | 'already_marked';
  student: DetectedFace['student'] | null;
  detail: string;
}

/** Result of marking every recognised face in one frame. */
export interface AttendanceBatchResult {
  message: string;
  date: string;
  faces_detected: number;
  marked_count: number;
  marked: MarkedStudent[];
  skipped: SkippedFace[];
}

export interface MealRequirements {
  rice_kg: number;
  wheat_kg: number;
  grains_kg: number;
  dal_kg: number;
  vegetables_kg: number;
  oil_liters: number;
  total_calories: number;
  total_protein_gms: number;
}

export interface MealPlan {
  date: string;
  students: {
    total_students: number;
    primary_students: number;
    upper_primary_students: number;
    secondary_students: number;
    rice_share: number;
    requirements: MealRequirements;
    per_student_averages: { calories: number; protein_gms: number };
  };
  requirements: MealRequirements;
  cost_estimate: {
    total_cost: number;
    per_student_cost: number;
    missing_prices: string[];
    is_complete: boolean;
    item_costs: Record<
      string,
      { quantity: number; unit_cost: number; total_cost: number; priced: boolean }
    >;
  };
  inventory_status: Array<{
    ingredient: string;
    item_name: string;
    tracked: boolean;
    required: number;
    available: number;
    unit: string;
    sufficient: boolean;
    shortage: number;
  }>;
  shortages: MealPlan['inventory_status'];
  can_serve: boolean;
  daily_record: { id: number; inventory_consumed: boolean } | null;
}

export interface AppUser {
  role: 'GOVERNMENT' | 'SCHOOL';
  employee_id: string;
  school_id: number | null;
  name: string;
  email: string;
}

export type StudentInput = Omit<Student, 'id' | 'created_at' | 'updated_at' | 'school_id'> & {
  school_id?: string;
};

export type InventoryInput = Omit<InventoryItem, 'id' | 'last_updated' | 'school_id'> & {
  school_id?: string;
};

export type SchoolInput = Omit<School, 'id' | 'created_at' | 'updated_at'>;
