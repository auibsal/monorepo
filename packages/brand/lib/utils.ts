import { parseError } from '@repo/observability/error';
import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';
import { toast } from 'sonner';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));

const capitalize = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1);

const handleError = (error: unknown): void => {
  const message = parseError(error);

  toast.error(message);
};
