
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { addHours, differenceInMilliseconds, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPhoneNumber(phone: string): string {
  if (phone.startsWith('39')) {
    return phone.substring(2);
  }
  return phone;
}

export function formatPhoneNumberDetailed(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('39') && cleaned.length === 12) {
    // Formato +39 320 1234567
    return `+${cleaned.substring(0, 2)} ${cleaned.substring(2, 5)} ${cleaned.substring(5)}`;
  }
  
  if (!cleaned.startsWith('39')) {
      return `+39 ${cleaned.substring(0,3)} ${cleaned.substring(3)}`;
  }
  
  // Fallback for other formats
  return `+${cleaned}`;
}


export function isSupportWindowActive(lastActivityAt: string | null): boolean {
  if (!lastActivityAt) {
    // If there's no activity date, assume it's active to avoid blocking new chats.
    // This could be adjusted based on desired business logic.
    return true;
  }
  
  const lastActivityDate = parseISO(lastActivityAt);
  const expirationDate = addHours(lastActivityDate, 24);
  const now = new Date();
  const diff = differenceInMilliseconds(expirationDate, now);

  return diff > 0;
}

export const getInitials = (name: string | null | undefined): string => {
    if (!name) return '';
    const nameParts = name.trim().split(' ');
    if (nameParts.length > 1) {
        const firstInitial = nameParts[0][0];
        const lastInitial = nameParts[nameParts.length - 1][0];
        return (firstInitial + lastInitial).toUpperCase();
    } else if (nameParts[0] && nameParts[0].length > 0) {
        return nameParts[0].substring(0, 2).toUpperCase();
    }
    return '';
};
