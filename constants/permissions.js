export const hasPermission = (member, key) => {
  if (
    member?.role === "super_admin" ||
    member?.roles?.includes("super_admin")
  ) {
    return true;
  }

  if (
    member?.role === "admin" ||
    member?.roles?.includes("admin")
  ) {
    return true;
  }

  if (
    member?.permissions?.includes("*")
  ) {
    return true;
  }

  return (
    Array.isArray(member?.permissions) &&
    member.permissions.includes(key)
  );
};