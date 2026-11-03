import { z } from "zod";
import { TaskPriorityEnum, TaskStatusEnum } from "../enums/task.enum";

export const titleSchema = z.string().trim().min(1, "Task title is required").max(255);
export const descriptionSchema = z.string().trim().optional().nullable();

export const assignedToSchema = z.string().trim().min(1).nullable().optional();

export const prioritySchema = z.enum(
  Object.values(TaskPriorityEnum) as [string, ...string[]]
);

export const statusSchema = z.enum(
  Object.values(TaskStatusEnum) as [string, ...string[]]
);

export const dueDateSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .refine(
    (val) => {
      return !val || !isNaN(Date.parse(val));
    },
    {
      message: "Invalid date format. Please provide a valid date string.",
    }
  );

export const taskIdSchema = z.string().trim().min(1);

export const createTaskSchema = z.object({
  title: titleSchema,
  description: descriptionSchema,
  priority: prioritySchema.optional(),
  status: statusSchema.optional(),
  assignedTo: assignedToSchema,
  dueDate: dueDateSchema,
  dependsOn: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  recurrence: z.enum(["NONE", "DAILY", "WEEKLY", "MONTHLY"]).optional(),
});

export const updateTaskSchema = z.object({
  title: titleSchema.optional(),
  description: descriptionSchema,
  priority: prioritySchema.optional(),
  status: statusSchema.optional(),
  assignedTo: assignedToSchema,
  dueDate: dueDateSchema,
  dependsOn: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  recurrence: z.enum(["NONE", "DAILY", "WEEKLY", "MONTHLY"]).optional(),
});
