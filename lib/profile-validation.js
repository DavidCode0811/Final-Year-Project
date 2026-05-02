import { z } from 'zod';

export const profileUpdateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters.')
    .max(120, 'Full name must be 120 characters or fewer.'),
  email: z
    .string()
    .trim()
    .email('Enter a valid email address.')
    .max(255, 'Email must be 255 characters or fewer.')
    .transform((value) => value.toLowerCase()),
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters.')
      .max(128, 'New password must be 128 characters or fewer.'),
    confirmPassword: z.string().min(1, 'Please confirm your new password.'),
  })
  .superRefine(({ currentPassword, newPassword, confirmPassword }, context) => {
    if (newPassword !== confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'New passwords do not match.',
      });
    }

    if (currentPassword && newPassword && currentPassword === newPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['newPassword'],
        message: 'New password must be different from your current password.',
      });
    }
  });

export function getValidationMessage(error, fallbackMessage) {
  if (!error) {
    return fallbackMessage;
  }

  if (error.issues?.length) {
    return error.issues[0].message;
  }

  return error.message || fallbackMessage;
}
