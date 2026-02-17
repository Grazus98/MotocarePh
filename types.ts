
export enum MaintenanceCategory {
  OIL_LUBE = 'OIL & LUBE',
  DRIVE_SYSTEM = 'DRIVE SYSTEM',
  AIR_SYSTEM = 'AIR SYSTEM',
  FLUIDS = 'FLUIDS',
  BRAKES = 'BRAKES',
  ELECTRICAL = 'ELECTRICAL',
  TIRES = 'TIRES',
  CLEANING = 'CLEANING',
  MECHANICAL = 'MECHANICAL'
}

export interface MaintenanceItem {
  id: string;
  category: MaintenanceCategory;
  name: string;
  intervalKm?: number;
  intervalMonths?: number;
  description: string;
  action: 'Change' | 'Clean' | 'Check' | 'Flush';
  lastServiceOdo: number;
  lastServiceDate: string;
  engineOilCount?: number; 
}

export interface MotorbikeState {
  modelName: string;
  currentOdo: number;
  maintenanceItems: MaintenanceItem[];
  history: ServiceLog[];
}

export interface ServiceLog {
  id: string;
  itemId: string;
  itemName: string;
  odoAtService: number;
  date: string;
  notes?: string;
}

export interface HealthStatus {
  percentage: number;
  status: 'Good' | 'Warning' | 'Critical';
  remaining: number;
}
