"use client";

import { usePathname } from "next/navigation";
import useUserPermissions from "./useUserPermissions";

const usePagePermission = () => {
  const pathname = usePathname();
  const { hasPermission, loading } = useUserPermissions();

  return {
    canView: hasPermission(pathname, "view"),
    canAdd: hasPermission(pathname, "add"),
    canEdit: hasPermission(pathname, "edit"),
    canDelete: hasPermission(pathname, "delete"),
    loading,
  };
};

export default usePagePermission;
