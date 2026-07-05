import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ReservationPayment from "@/models/ReservationPayment";
import Reservation from "@/models/Reservation";
import Customer from "@/models/Customer";
import FolioEntry from "@/models/FolioEntry";
import Stay from "@/models/Stay";
import { verifyToken } from "@/lib/auth";

export async function GET(req) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    const search = searchParams.get("search") || "";
    const source = searchParams.get("source") || "all"; // all, reservation, stay
    const paymentMethod = searchParams.get("paymentMethod") || "all"; // all, cash, card, mobile, other

    let dateQueryRP = {};
    let dateQueryFE = {};

    // Date range filter
    if (startDateStr && endDateStr) {
      const start = new Date(startDateStr);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDateStr);
      end.setHours(23, 59, 59, 999);
      
      dateQueryRP.paymentDate = { $gte: start, $lte: end };
      dateQueryFE.date = { $gte: start, $lte: end };
    } else {
      // Default to today
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      
      dateQueryRP.paymentDate = { $gte: start, $lte: end };
      dateQueryFE.date = { $gte: start, $lte: end };
    }

    let allPayments = [];

    // 1. Fetch Reservation Payments (if source matches)
    if (source === "all" || source === "reservation") {
      const resPayments = await ReservationPayment.find(dateQueryRP)
        .populate({
          path: "reservationId",
          populate: { path: "customer" }
        })
        .sort({ paymentDate: -1 });

      const formattedRP = resPayments.map(p => {
        return {
          id: p._id,
          source: "Pre-Booking Prepayment",
          date: p.paymentDate,
          refNo: p.reservationId?.reservationNo || "N/A",
          customer: p.reservationId?.customer || null,
          paymentType: p.paymentType || "Cash",
          transactionRef: p.transactionRef || "N/A",
          amount: p.amount,
          notes: p.notes || "",
          status: p.reservationId?.status || "",
          receivedBy: p.receivedBy || ""
        };
      });

      allPayments = [...allPayments, ...formattedRP];
    }

    // 2. Fetch Stay Folio Payments (if source matches)
    if (source === "all" || source === "stay") {
      const folioQuery = {
        type: { $in: ["Payment", "Advance Payment"] },
        ...dateQueryFE
      };

      const folioPayments = await FolioEntry.find(folioQuery)
        .populate({
          path: "stayId",
          populate: { path: "customer" }
        })
        .sort({ date: -1 });

      const formattedFE = folioPayments.map(f => {
        const desc = f.description || "";
        let method = "Other";
        
        // Try parsing payment method from folio entry description, e.g. "Walk-in Payment (Cash)"
        if (desc.toLowerCase().includes("cash")) {
          method = "Cash";
        } else if (desc.toLowerCase().includes("card") || desc.toLowerCase().includes("pos")) {
          method = "Card";
        } else if (desc.toLowerCase().includes("bkash")) {
          method = "bKash";
        } else if (desc.toLowerCase().includes("nagad")) {
          method = "Nagad";
        } else if (desc.toLowerCase().includes("rocket")) {
          method = "Rocket";
        } else {
          method = f.type || "Folio Payment";
        }

        // Try extracting reference
        let txnRef = "N/A";
        const refIndex = desc.toLowerCase().indexOf("ref:");
        if (refIndex !== -1) {
          const rawRef = desc.substring(refIndex + 4).trim();
          txnRef = rawRef || "N/A";
        }

        return {
          id: f._id,
          source: "Stay Folio Payment",
          date: f.date,
          refNo: f.stayId?.stayNo || "N/A",
          customer: f.stayId?.customer || null,
          paymentType: method,
          transactionRef: txnRef,
          amount: f.credit - f.debit, // net payments (credits minus debits)
          notes: desc,
          status: f.stayId?.status || ""
        };
      });

      allPayments = [...allPayments, ...formattedFE];
    }

    // Filter by search keyword
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      allPayments = allPayments.filter(p => {
        const refNo = p.refNo || "";
        const name = p.customer?.fullName || "";
        const phone = p.customer?.phoneNumber || "";
        const txRef = p.transactionRef || "";
        const notes = p.notes || "";
        return refNo.toLowerCase().includes(searchLower) ||
               name.toLowerCase().includes(searchLower) ||
               phone.toLowerCase().includes(searchLower) ||
               txRef.toLowerCase().includes(searchLower) ||
               notes.toLowerCase().includes(searchLower);
      });
    }

    // Filter by payment method
    if (paymentMethod !== "all") {
      const methodLower = paymentMethod.toLowerCase();
      allPayments = allPayments.filter(p => {
        const type = (p.paymentType || "").toLowerCase();
        if (methodLower === "cash") return type.includes("cash");
        if (methodLower === "card") return type.includes("card") || type.includes("pos");
        if (methodLower === "mobile") return type.includes("bkash") || type.includes("rocket") || type.includes("nagad") || type.includes("mfs") || type.includes("mobile");
        if (methodLower === "other") return !type.includes("cash") && !type.includes("card") && !type.includes("pos") && !type.includes("bkash") && !type.includes("rocket") && !type.includes("nagad") && !type.includes("mfs") && !type.includes("mobile");
        return true;
      });
    }

    // Sort all payments by date descending
    allPayments.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calculate aggregated stats over the filtered list
    let totalReceived = 0;
    let cashTotal = 0;
    let cardTotal = 0;
    let mobileTotal = 0;
    let otherTotal = 0;

    allPayments.forEach(p => {
      totalReceived += p.amount;
      const type = (p.paymentType || "").toLowerCase();
      if (type.includes("cash")) {
        cashTotal += p.amount;
      } else if (type.includes("card") || type.includes("pos")) {
        cardTotal += p.amount;
      } else if (type.includes("bkash") || type.includes("rocket") || type.includes("nagad") || type.includes("mfs") || type.includes("mobile")) {
        mobileTotal += p.amount;
      } else {
        otherTotal += p.amount;
      }
    });

    return NextResponse.json({
      payments: allPayments,
      stats: {
        totalReceived,
        cashTotal,
        cardTotal,
        mobileTotal,
        otherTotal
      }
    }, { status: 200 });

  } catch (err) {
    console.error("GET payments error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const source = searchParams.get("source"); // "Stay Folio Payment" or "Pre-Booking Prepayment"

    if (!id) {
      return NextResponse.json({ message: "Payment ID is required." }, { status: 400 });
    }

    if (source === "Pre-Booking Prepayment") {
      const deleted = await ReservationPayment.findByIdAndDelete(id);
      if (!deleted) {
        return NextResponse.json({ message: "Reservation payment not found." }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: "Reservation payment deleted." }, { status: 200 });
    } else {
      // Stay Folio Payment — delete FolioEntry
      const deleted = await FolioEntry.findByIdAndDelete(id);
      if (!deleted) {
        return NextResponse.json({ message: "Folio entry not found." }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: "Folio payment entry deleted." }, { status: 200 });
    }
  } catch (err) {
    console.error("DELETE payment error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
