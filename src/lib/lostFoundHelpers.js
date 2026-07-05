import { verifyToken } from "./auth";
import Permission from "@/models/Permission";
import LostFoundActivityLog from "@/models/LostFoundActivityLog";
import LostFoundNotification from "@/models/LostFoundNotification";

/**
 * Helper to verify user token and check RBAC permissions
 * @param {Request} req - Next.js Request object
 * @param {String} permissionPath - The permission key or path (e.g. 'lost_found.view')
 * @returns {Object} { error, status, user }
 */
export async function verifyLostFoundPermission(req, permissionPath) {
  const auth = verifyToken(req);
  if (auth.error) {
    return { error: auth.error, status: auth.status };
  }

  const user = auth.user;
  if (!user || !user.role) {
    return { error: "Access token contains no role", status: 403 };
  }

  // Bypass for superadmin and admin
  if (user.role === "superadmin" || user.role === "admin") {
    return { user };
  }

  // Map permissionPath to route path and action field
  let targetPath = null;
  let actionField = "canView"; // Default to view

  // Detect method to refine action
  const method = req.method ? req.method.toUpperCase() : "GET";

  if (permissionPath === "lost_found.settings.manage") {
    // Determine path based on URL
    const url = req.url || "";
    if (url.includes("/categories")) {
      targetPath = "/dashboard/lost-found/categories";
    } else if (url.includes("/locations")) {
      targetPath = "/dashboard/lost-found/locations";
    } else {
      targetPath = "/dashboard/lost-found/categories";
    }

    // Determine action field based on method
    if (method === "GET") actionField = "canView";
    else if (method === "POST") actionField = "canAdd";
    else if (method === "PUT" || method === "PATCH") actionField = "canEdit";
    else if (method === "DELETE") actionField = "canDelete";
  } else if (permissionPath === "lost_found.view") {
    const url = req.url || "";
    if (url.includes("/return-notes")) {
      targetPath = "/dashboard/lost-found/return-notes";
    } else if (url.includes("/dashboard")) {
      targetPath = "/dashboard/lost-found/dashboard";
    } else {
      targetPath = "/dashboard/lost-found/active-items";
    }
    actionField = "canView";
  } else if (permissionPath === "lost_found.create") {
    targetPath = "/dashboard/lost-found/new-item";
    actionField = "canAdd";
  } else if (permissionPath === "lost_found.edit") {
    targetPath = "/dashboard/lost-found/active-items";
    actionField = "canEdit";
  } else if (permissionPath === "lost_found.delete") {
    targetPath = "/dashboard/lost-found/active-items";
    actionField = "canDelete";
  } else if (permissionPath === "lost_found.claims.view") {
    targetPath = "/dashboard/lost-found/claims";
    actionField = "canView";
  } else if (permissionPath === "lost_found.claims.verify") {
    targetPath = "/dashboard/lost-found/claims";
    actionField = "canEdit";
  } else if (permissionPath === "lost_found.return.create") {
    targetPath = "/dashboard/lost-found/returns";
    actionField = "canAdd";
  } else if (permissionPath === "lost_found.reports.view") {
    targetPath = "/dashboard/lost-found/reports";
    actionField = "canView";
  } else {
    // If it's already a route path string, use it directly
    if (permissionPath.startsWith("/")) {
      targetPath = permissionPath;
      if (method === "GET") actionField = "canView";
      else if (method === "POST") actionField = "canAdd";
      else if (method === "PUT" || method === "PATCH") actionField = "canEdit";
      else if (method === "DELETE") actionField = "canDelete";
    } else {
      // Fallback
      targetPath = "/dashboard/lost-found/dashboard";
      actionField = "canView";
    }
  }

  // Check if role has permission allowed for the path/key
  const permission = await Permission.findOne({
    role: user.role,
    path: targetPath,
  });

  const isAllowed = permission && (permission.isAllowed || permission[actionField] === true);

  if (!isAllowed) {
    return { error: "Forbidden: You do not have permission to perform this action.", status: 403 };
  }

  return { user };
}

/**
 * Helper to log mutations in activity log collection
 */
export async function logLostFoundActivity({ req, itemId = null, action, oldValue = null, newValue = null, user }) {
  try {
    const clientIP = req?.headers?.get("x-forwarded-for")?.split(",")[0] || "Unknown IP";
    const userId = user?.id || user?._id;

    await LostFoundActivityLog.create({
      itemId,
      action,
      oldValue,
      newValue,
      performedBy: userId,
      ipAddress: clientIP,
    });
  } catch (err) {
    console.error("Failed to log lost found activity:", err);
  }
}

/**
 * Helper to create an in-app notification
 */
export async function createLostFoundNotification({ itemId = null, type, title, message }) {
  try {
    await LostFoundNotification.create({
      itemId,
      type,
      title,
      message,
      read: false,
    });
    console.log(`Notification triggered [${type}]: ${title}`);
  } catch (err) {
    console.error("Failed to create lost found notification:", err);
  }
}
