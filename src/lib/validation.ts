import { z } from "zod";
import { toast } from "sonner";

export type FieldErrors = Record<string, string>;

export type ValidationResult<T> =
  | { success: true; data: T; errors: FieldErrors }
  | { success: false; data?: undefined; errors: FieldErrors; firstError: string };

/** Chạy schema zod, trả về dữ liệu đã chuẩn hóa hoặc map lỗi theo từng field. */
export function validate<S extends z.ZodType>(
  schema: S,
  input: unknown
): ValidationResult<z.output<S>> {
  const result = schema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data, errors: {} };
  }
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_form";
    if (!errors[key]) errors[key] = issue.message;
  }
  const firstError = result.error.issues[0]?.message ?? "Dữ liệu không hợp lệ";
  return { success: false, errors, firstError };
}

/** Validate + hiện toast lỗi đầu tiên nếu sai. Dùng ngay trong onSubmit. */
export function validateWithToast<S extends z.ZodType>(
  schema: S,
  input: unknown,
  setErrors?: (errors: FieldErrors) => void
): ValidationResult<z.output<S>> {
  const result = validate(schema, input);
  setErrors?.(result.errors);
  if (!result.success) toast.error(result.firstError);
  return result;
}
