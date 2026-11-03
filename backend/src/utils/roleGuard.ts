import { PermissionType, Permissions } from "../enums/role.enum";
import { ForbiddenException } from "./appError";
import { RolePermissions } from "./role-permission";

export const roleGuard = (
  role: keyof typeof RolePermissions,
  requiredPermissions: PermissionType[]
) => {
  const permissions = RolePermissions[role];
  if (!permissions) {
    throw new ForbiddenException(
      "You do not have the necessary permissions to perform this action"
    );
  }

  const hasPermission = requiredPermissions.every((permission) =>
    permissions.includes(permission)
  );

  if (!hasPermission) {
    throw new ForbiddenException(
      "You do not have the necessary permissions to perform this action"
    );
  }
};
