import { NextResponse } from "next/server";
import mongoose from "mongoose";
import RestaurantTable from "@/models/RestaurantTable";
import Invoice from "@/models/Invoice";
import TableReservation from "@/models/TableReservation";

const MONGO_URI = process.env.MONGODB_URI;

async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(MONGO_URI);
}

export async function GET(req) {
  try {
    await connectToDatabase();

    // 1. Get all tables
    const tables = await RestaurantTable.find().sort({ tableName: 1 }).lean();

    // 2. Get active unpaid restaurant invoices (orderStatus != 'served' or paymentStatus == 'Unpaid')
    const activeInvoices = await Invoice.find({
      invoiceType: "Restaurant",
      paymentStatus: "Unpaid",
      orderStatus: { $ne: "served" }
    }).lean();

    // 3. Get today's active table reservations
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const activeReservations = await TableReservation.find({
      startTime: { $gte: startOfToday, $lte: endOfToday },
      status: { $in: ["Pending", "Confirmed"] }
    }).lean();

    // 4. Compute status on the fly for each table
    const mappedTables = tables.map(table => {
      const name = table.tableName;

      // Find if there is an active invoice for this table
      const matchedInvoice = activeInvoices.find(inv => 
        (inv.tableName && inv.tableName.toLowerCase() === name.toLowerCase()) ||
        (inv.tableNo && inv.tableNo.toLowerCase() === name.toLowerCase())
      );

      if (matchedInvoice) {
        // Determine status based on products' cookStatus
        const products = matchedInvoice.products || [];
        const isCooking = products.some(p => p.cookStatus === 'COOKING');
        const isPending = products.some(p => p.cookStatus === 'PENDING');
        const allServed = products.length > 0 && products.every(p => p.cookStatus === 'SERVED');

        let tableStatus = 'pending'; // Occupied default
        if (isCooking) tableStatus = 'cooking';
        else if (allServed) tableStatus = 'served';

        return {
          ...table,
          status: tableStatus,
          invoiceId: matchedInvoice._id
        };
      }

      // Check if there is an active reservation close to current time (e.g. within 2 hours)
      const matchedReservation = activeReservations.find(res => 
        res.tableName && res.tableName.toLowerCase() === name.toLowerCase()
      );

      if (matchedReservation) {
        const resTime = new Date(matchedReservation.startTime);
        const diffHours = Math.abs(now - resTime) / 3600000;
        
        // If reservation start time is within 2 hours
        if (diffHours <= 2) {
          return {
            ...table,
            status: 'reserved',
            reservation: {
              customerName: matchedReservation.customerName,
              customerPhone: matchedReservation.customerPhone,
              startTime: matchedReservation.startTime,
              endTime: matchedReservation.endTime
            }
          };
        }
      }

      // Default: Available/Free
      return {
        ...table,
        status: 'free'
      };
    });

    return NextResponse.json(mappedTables, { status: 200 });
  } catch (error) {
    console.error("Error computing table statuses:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
