import jwt from "jsonwebtoken";

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
