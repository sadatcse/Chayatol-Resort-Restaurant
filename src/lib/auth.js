import jwt from "jsonwebtoken";
import dbConnect from "./db";
import Permission from "../models/Permission";

const JWT_SECRET = process.env.JWT_SECRET || "secretKey";

export function verifyToken(req) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1];
  if (!token) {
    return { error: "Access token missing", status: 401 };
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { user: decoded };
  } catch (err) {
    return { error: "Invalid token", status: 403 };
  }
}

/**
 * Helper to verify user permissions for a single route path and action.
 * @param {Request} req 
 * @param {String} targetPath - UI path (e.g. '/dashboard/venue/booking')
 * @param {String} action - 'view' | 'add' | 'edit' | 'delete'
 */
export async function verifyApiPermission(req, targetPath, action = "view") {
  const auth = verifyToken(req);
  if (auth.error) {
    return { error: auth.error, status: auth.status };
  }

  const user = auth.user;
  if (!user || !user.role) {
    return { error: "Access token contains no role", status: 403 };
  }

  // Superadmin bypasses all permission checks
  if (user.role === "superadmin") {
    return { user };
  }

  await dbConnect();

  let actionField = "canView";
  if (action === "add" || action === "create") actionField = "canAdd";
  else if (action === "edit" || action === "update") actionField = "canEdit";
  else if (action === "delete") actionField = "canDelete";

  const permission = await Permission.findOne({
    role: user.role,
    path: targetPath
  });

  const isAllowed = permission && (permission.isAllowed || permission[actionField] === true);

  if (!isAllowed) {
    return { error: `Forbidden: You do not have permission (${action}) to access ${targetPath}.`, status: 403 };
  }

  return { user };
}

/**
 * Helper to verify user permissions across multiple alternative paths (at least one must pass).
 * @param {Request} req 
 * @param {Array<String>} targetPaths - List of UI paths
 * @param {String} action - 'view' | 'add' | 'edit' | 'delete'
 */
export async function verifyMultiplePathsPermission(req, targetPaths, action = "view") {
  const auth = verifyToken(req);
  if (auth.error) {
    return { error: auth.error, status: auth.status };
  }

  const user = auth.user;
  if (!user || !user.role) {
    return { error: "Access token contains no role", status: 403 };
  }

  // Superadmin bypasses all permission checks
  if (user.role === "superadmin") {
    return { user };
  }

  await dbConnect();

  let actionField = "canView";
  if (action === "add" || action === "create") actionField = "canAdd";
  else if (action === "edit" || action === "update") actionField = "canEdit";
  else if (action === "delete") actionField = "canDelete";

  const permissions = await Permission.find({
    role: user.role,
    path: { $in: targetPaths }
  });

  const isAllowed = permissions.some(
    (perm) => perm.isAllowed || perm[actionField] === true
  );

  if (!isAllowed) {
    return { error: `Forbidden: You do not have permission (${action}) to access these resources.`, status: 403 };
  }

  return { user };
}

