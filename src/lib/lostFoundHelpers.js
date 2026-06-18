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

  // Check if role has permission allowed for the path/key
  const permission = await Permission.findOne({
    role: user.role,
    path: permissionPath,
    isAllowed: true,
  });

  if (!permission) {
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
