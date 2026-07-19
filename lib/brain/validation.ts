import { z } from 'zod';

export const businessProfileSchema = z.object({
  name: z.string().min(1, 'Business name is required').max(120),
  industry: z.string().min(1, 'Industry is required').max(120),
  description: z.string().max(2000).optional(),
  website: z.string().url('Enter a valid URL').max(300).optional().or(z.literal('')),
});

export const goalSchema = z.object({
  description: z.string().min(1).max(300),
  priority: z.number().int().min(1),
});

export const goalsSchema = z.array(goalSchema).min(1, 'Add at least one goal');

export const personSchema = z.object({
  name: z.string().min(1).max(120),
  relationship: z.enum(['customer', 'prospect', 'supplier', 'employee', 'partner']),
  email: z.string().email().optional().or(z.literal('')),
  // Recommendation 2, approved by Founder + CPO, 19 July 2026 — Business
  // Memory, not something extracted from Calendar or Gmail (neither has
  // a company field at all). Deliberately only added here, in Settings'
  // add/edit Person capability — not to onboarding's People step, per
  // the CPO's explicit categorisation: "Onboarding establishes identity.
  // Continuous Executive Learning builds understanding." A contact's
  // company is understanding, not identity.
  company: z.string().max(120).optional().or(z.literal('')),
  notes: z.string().max(1000).optional(),
});

export const peopleSchema = z.array(personSchema);

export type BusinessProfileFormValues = z.infer<typeof businessProfileSchema>;
export type GoalFormValues = z.infer<typeof goalSchema>;
export type PersonFormValues = z.infer<typeof personSchema>;
