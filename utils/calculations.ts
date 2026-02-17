
import { MaintenanceItem, HealthStatus } from '../types';

export const calculateHealth = (item: MaintenanceItem, currentOdo: number): HealthStatus => {
  if (item.intervalKm) {
    const elapsed = currentOdo - item.lastServiceOdo;
    const remaining = item.intervalKm - elapsed;
    const percentage = Math.max(0, Math.min(100, (remaining / item.intervalKm) * 100));
    
    let status: HealthStatus['status'] = 'Good';
    if (percentage <= 0) status = 'Critical';
    else if (percentage <= 25) status = 'Warning';

    return { percentage, status, remaining };
  }
  
  if (item.intervalMonths) {
    const lastDate = new Date(item.lastServiceDate);
    const now = new Date();
    const diffMonths = (now.getFullYear() - lastDate.getFullYear()) * 12 + (now.getMonth() - lastDate.getMonth());
    const remaining = item.intervalMonths - diffMonths;
    const percentage = Math.max(0, Math.min(100, (remaining / item.intervalMonths) * 100));

    let status: HealthStatus['status'] = 'Good';
    if (percentage <= 0) status = 'Critical';
    else if (percentage <= 25) status = 'Warning';

    return { percentage, status, remaining };
  }

  return { percentage: 100, status: 'Good', remaining: 0 };
};

export const getStatusColor = (status: HealthStatus['status']) => {
  switch (status) {
    case 'Critical': return 'text-red-500 bg-red-500/10 border-red-500/20';
    case 'Warning': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    case 'Good': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
  }
};

export const getProgressColor = (status: HealthStatus['status']) => {
  switch (status) {
    case 'Critical': return 'bg-red-500';
    case 'Warning': return 'bg-amber-500';
    case 'Good': return 'bg-emerald-500';
  }
};
