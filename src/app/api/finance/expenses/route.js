import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Expense from "@/models/Expense";
import ExpenseCategory from "@/models/ExpenseCategory";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const paymentMethod = searchParams.get("paymentMethod") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    const skip = (page - 1) * limit;
    const query = {};

    if (category) {
      query.category = category;
    }
    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }
    if (startDate || endDate) {
      query.expenseDate = {};
      if (startDate) {
        query.expenseDate.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.expenseDate.$lte = end;
      }
    }

    if (search) {
      // Find matching categories first to search by category name
      const matchingCats = await ExpenseCategory.find({
        name: { $regex: search, $options: "i" }
      });
      const catIds = matchingCats.map(c => c._id);

      query.$or = [
        { subcategory: { $regex: search, $options: "i" } },
        { vendor: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { referenceNo: { $regex: search, $options: "i" } },
        { category: { $in: catIds } }
      ];
    }

    const [expenses, total, stats] = await Promise.all([
      Expense.find(query)
        .populate("category")
        .sort({ expenseDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Expense.countDocuments(query),
      Expense.aggregate([
        { $match: query },
        { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
      ])
    ]);

    const totalExpenseAmount = stats.length > 0 ? stats[0].totalAmount : 0;

    return NextResponse.json(
      {
        expenses,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        totalItems: total,
        totalExpenseAmount
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get paginated expenses error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const expenseData = await req.json();

    if (!expenseData.expenseDate || !expenseData.category || !expenseData.amount) {
      return NextResponse.json(
        { message: "Missing required fields (expenseDate, category, amount)." },
        { status: 400 }
      );
    }

    const newExpense = await Expense.create({
      ...expenseData,
      createdBy: auth.user._id || auth.user.id
    });

    await logTransaction({
      req,
      resStatus: 201,
      user: auth.user,
      details: `Logged expense of ৳${newExpense.amount} for category ID: ${newExpense.category}`,
    });

    return NextResponse.json(newExpense, { status: 201 });
  } catch (err) {
    console.error("Create expense route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
