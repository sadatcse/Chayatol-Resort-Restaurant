import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import VenueBooking from "@/models/VenueBooking";
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
        path: "/dashboard/reports/venue-bookings",
      });

      const isAllowed = permission && (permission.isAllowed || permission.canView === true);
      if (!isAllowed) {
        return NextResponse.json({ message: "Forbidden: You do not have permission to view venue reports." }, { status: 403 });
      }
    } catch (err) {
      console.error("Permission check error in venue bookings report API:", err);
      return NextResponse.json({ error: "Failed to verify permission" }, { status: 500 });
    }
  }

  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get("startDate") || "";
    const endDateParam = searchParams.get("endDate") || "";
    const status = searchParams.get("status") || "all";

    const query = {};

    // Filter by Event Start Date Range
    if (startDateParam || endDateParam) {
      query.startDate = {};
      if (startDateParam) {
        const start = new Date(startDateParam);
        start.setHours(0, 0, 0, 0);
        query.startDate.$gte = start;
      }
      if (endDateParam) {
        const end = new Date(endDateParam);
        end.setHours(23, 59, 59, 999);
        query.startDate.$lte = end;
      }
    }

    // Filter by Booking Status
    if (status && status !== "all") {
      query.bookingStatus = status;
    }

    // Fetch and populate Customer
    const bookings = await VenueBooking.find(query)
      .populate("customer", "name email mobileNumber")
      .sort({ startDate: -1 });

    let totalRevenue = 0;
    let totalPaid = 0;
    let totalDue = 0;

    const sizeBreakdown = {
      "Full Venue": 0,
      "Half Venue": 0,
    };

    const statusBreakdown = {
      Pending: 0,
      Confirmed: 0,
      Cancelled: 0,
    };

    const dailyStatsMap = {};

    const formattedBookings = bookings.map((book) => {
      totalRevenue += book.totalAmount || 0;
      totalPaid += book.paidAmount || 0;
      totalDue += book.dueAmount || 0;

      // Status breakdown
      const bStatus = book.bookingStatus || "Confirmed";
      if (statusBreakdown[bStatus] !== undefined) {
        statusBreakdown[bStatus]++;
      }

      // Size breakdown
      const size = book.venueSize || "Full Venue";
      if (sizeBreakdown[size] !== undefined) {
        sizeBreakdown[size]++;
      }

      // Timeseries date calculation (using startDate)
      const dateStr = book.startDate ? new Date(book.startDate).toISOString().split("T")[0] : new Date(book.createdAt).toISOString().split("T")[0];
      if (!dailyStatsMap[dateStr]) {
        dailyStatsMap[dateStr] = { date: dateStr, revenue: 0, bookings: 0 };
      }
      dailyStatsMap[dateStr].revenue += book.totalAmount || 0;
      dailyStatsMap[dateStr].bookings += 1;

      return {
        _id: book._id,
        bookingNumber: book.bookingNumber,
        eventTitle: book.eventTitle,
        startDate: book.startDate,
        endDate: book.endDate,
        customerName: book.customer?.name || "Private Customer",
        customerEmail: book.customer?.email || "",
        customerMobile: book.customer?.mobileNumber || "",
        venueSize: size,
        pricingType: book.pricingType,
        totalAmount: book.totalAmount || 0,
        paidAmount: book.paidAmount || 0,
        dueAmount: book.dueAmount || 0,
        paymentStatus: book.paymentStatus || "Unpaid",
        bookingStatus: bStatus,
        numberOfGuests: book.numberOfGuests || 0,
      };
    });

    // Form timeseries array sorted chronologically
    const dailyStats = Object.values(dailyStatsMap).sort((a, b) => new Date(a.date) - new Date(b.date));

    return NextResponse.json({
      summary: {
        totalBookings: bookings.length,
        totalRevenue,
        totalPaid,
        totalDue,
        statusBreakdown,
        sizeBreakdown,
      },
      dailyStats,
      bookings: formattedBookings,
    }, { status: 200 });

  } catch (err) {
    console.error("Venue Bookings Report API route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
