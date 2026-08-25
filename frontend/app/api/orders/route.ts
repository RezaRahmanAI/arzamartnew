import { NextResponse } from "next/server";
import { getAllOrders } from "@/lib/data/orders";
import { createOrderAction } from "@/actions/orders.actions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getAllOrders();
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/orders error:", error);
    return NextResponse.json({ orders: [], incomplete: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await createOrderAction(body);
    if (!result.success) {
      return NextResponse.json({ isSuccess: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json(
      {
        isSuccess: true,
        data: { id: result.id, orderNumber: result.orderNumber },
        message: "Order placed successfully",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        isSuccess: false,
        message: error instanceof Error ? error.message : "Invalid order data",
      },
      { status: 400 }
    );
  }
}
