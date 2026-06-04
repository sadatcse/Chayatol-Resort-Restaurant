import TransactionLog from "@/models/TransactionLog";

export async function logTransaction({ req, resStatus, user, amount = 0, details = null, message = null, stackTrace = null }) {
  try {
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0] || "Unknown IP";
    
    const userEmail = req.headers.get("x-user-email") || user?.email || "Unknown User";
    const userName = req.headers.get("x-user-name") || user?.name || "Unknown User";

    const logData = {
      transactionType: req.method,
      transactionCode: resStatus.toString(),
      userEmail,
      userName,
      ipAddress: clientIP,
      status: resStatus >= 400 ? "failed" : "success",
      amount: amount || 0,
      details: details || `Request to ${req.nextUrl.pathname}`,
      message: message ? (typeof message === "string" ? message : JSON.stringify(message)) : null,
      stackTrace,
      transactionTime: new Date(),
    };

    await TransactionLog.create(logData);
  } catch (error) {
    console.error("Error logging transaction:", error);
  }
}
