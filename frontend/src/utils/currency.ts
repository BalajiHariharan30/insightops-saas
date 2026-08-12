/**
 * Indian Rupee (INR) Currency Formatting Utilities
 * Uses en-IN locale for proper lakh/crore number formatting
 */

export const formatINR = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatINRDecimal = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Format as INR per hour for payroll
export const formatINRPerHour = (rate: number): string => {
  return `₹${new Intl.NumberFormat('en-IN').format(rate)}/hr`;
};

// Indian date format: DD/MM/YYYY
export const formatIndianDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
};

// Indian time in IST
export const formatISTTime = (dateStr: string): string => {
  return new Date(dateStr).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
    hour12: true,
  });
};
