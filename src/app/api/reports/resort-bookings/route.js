import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Reservation from "@/models/Reservation";
import Permission from "@/models/Permission";
import { verifyToken } from "@/lib/auth";

export async function GET(req) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  // Permission Check
  if (auth.user.role !== "superadmin" && auth.user.role !== "admin") {
    try {
      await dbConnect();
      const permission = await Permission.findOne({
        role: auth.user.role,
        path: "/dashboard/reports/resort-bookings",
      });

      const isAllowed = permission && (permission.isAllowed || permission.canView === true);
      if (!isAllowed) {
        return NextResponse.json({ message: "Forbidden: You do not have permission to view resort reports." }, { status: 403 });
      }
    } catch (err) {
      console.error("Permission check error in resort bookings report API:", err);
      return NextResponse.json({ error: "Failed to verify permission" }, { status: 500 });
    }
  }

  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const status = searchParams.get("status") || "all";

    const query = {};

    // Filter by Date Range (against bookingDate)
    if (startDate || endDate) {
      query.bookingDate = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.bookingDate.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.bookingDate.$lte = end;
      }
    }

    // Filter by Status
    if (status && status !== "all") {
      query.status = status;
    }

    // Fetch and populate Customer
    const reservations = await Reservation.find(query)
      .populate("customer", "name email mobileNumber")
      .sort({ bookingDate: -1 });

    let totalRevenue = 0;
    let totalNights = 0;
    let confirmedCount = 0;

    const sourceBreakdown = {
      Website: 0,
      Phone: 0,
      Agent: 0,
      "Walk-in": 0
    };

    const dailyStatsMap = {};

    const formattedReservations = reservations.map((res) => {
      // Calculate revenue for this reservation
      const resRevenue = res.rooms?.reduce((acc, r) => acc + (r.nightlyRate * r.nights), 0) || 0;
      const resNights = res.rooms?.reduce((acc, r) => acc + r.nights, 0) || 0;

      totalRevenue += resRevenue;
      totalNights += resNights;

      const isConfirmed = ["Confirmed", "Partially Paid", "Fully Paid", "Checked-In", "Completed"].includes(res.status);
      if (isConfirmed) {
        confirmedCount++;
      }

      // Source Breakdown
      const source = res.bookingSource || "Walk-in";
      if (sourceBreakdown[source] !== undefined) {
        sourceBreakdown[source]++;
      } else {
        sourceBreakdown["Walk-in"]++;
      }

      // Timeseries date calculation (YYYY-MM-DD)
      const dateStr = res.bookingDate ? new Date(res.bookingDate).toISOString().split("T")[0] : new Date(res.createdAt).toISOString().split("T")[0];
      if (!dailyStatsMap[dateStr]) {
        dailyStatsMap[dateStr] = { date: dateStr, revenue: 0, bookings: 0 };
      }
      dailyStatsMap[dateStr].revenue += resRevenue;
      dailyStatsMap[dateStr].bookings += 1;

      return {
        _id: res._id,
        reservationNo: res.reservationNo,
        bookingDate: res.bookingDate,
        checkInDate: res.checkInDate,
        checkOutDate: res.checkOutDate,
        customerName: res.customer?.name || "Walk-in Guest",
        customerEmail: res.customer?.email || "",
        customerMobile: res.customer?.mobileNumber || "",
        bookingSource: source,
        status: res.status,
        revenue: resRevenue,
        nights: resNights,
        roomsCount: res.rooms?.length || 0,
      };
    });

    // Form timeseries array sorted chronologically
    const dailyStats = Object.values(dailyStatsMap).sort((a, b) => new Date(a.date) - new Date(b.date));

    return NextResponse.json({
      summary: {
        totalBookings: reservations.length,
        confirmedBookings: confirmedCount,
        totalRevenue,
        totalNights,
        sourceBreakdown,
      },
      dailyStats,
      reservations: formattedReservations,
    }, { status: 200 });

  } catch (err) {
    console.error("Resort Bookings Report API route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
