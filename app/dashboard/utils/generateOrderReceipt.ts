// app/utils/pdf/generateOrderReceipt.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Order } from "../hooks/useMedicalOrder";

export function generateOrderReceipt(order: Order, userName: string) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, pageWidth, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("DOZA MEDICAL", pageWidth / 2, 25, { align: "center" });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Order Receipt", 14, 55);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Order ID: ${order.orderId}`, 14, 65);
  doc.text(
    `Date: ${new Date(order.createdAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`,
    14,
    71,
  );

  const deliveryDate = new Date(order.createdAt);
  deliveryDate.setDate(deliveryDate.getDate() + 5);
  doc.text(
    `Estimated Delivery: ${deliveryDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })}`,
    14,
    77,
  );

  doc.setFont("helvetica", "bold");
  doc.text("Customer Information", 14, 90);
  doc.setFont("helvetica", "normal");
  doc.text(`Name: ${userName}`, 14, 98);
  doc.text(`Address: ${order.deliveryAddress}`, 14, 104);
  doc.text(`Phone: ${order.phoneNumber}`, 14, 110);

  autoTable(doc, {
    startY: 120,
    head: [["Product", "Qty", "Unit Price (NGN)", "Total (NGN)"]],
    body: order.items.map((item) => [
      item.name +
        (item.size ? ` (${item.size})` : "") +
        (item.color ? `, ${item.color}` : ""),
      item.quantity,
      `NGN ${item.price.toLocaleString()}`,
      `NGN ${(item.price * item.quantity).toLocaleString()}`,
    ]),
    foot: [
      ["", "", "Subtotal", `NGN ${order.subtotal.toLocaleString()}`],
      ["", "", "Delivery Fee", `NGN ${order.deliveryFee.toLocaleString()}`],
      ["", "", "Total", `NGN ${order.totalAmount.toLocaleString()}`],
    ],
    theme: "striped",
    headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255] },
    footStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: "bold",
    },
    columnStyles: { 0: { cellWidth: 80 } },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFont("helvetica", "bold");
  doc.text("Payment Method", 14, finalY);
  doc.setFont("helvetica", "normal");
  doc.text(order.paymentMethod, 14, finalY + 6);

  doc.setFont("helvetica", "bold");
  doc.text("Order Status", 14, finalY + 16);
  doc.setFont("helvetica", "normal");
  const statusColor =
    order.status === "processing"
      ? "#F59E0B"
      : order.status === "confirmed"
        ? "#3B82F6"
        : "#10B981";
  doc.setTextColor(statusColor);
  doc.text(
    order.status.charAt(0).toUpperCase() + order.status.slice(1),
    14,
    finalY + 22,
  );
  doc.setTextColor(0, 0, 0);

  doc.setFontSize(9);
  doc.text("Thank you for choosing Doza Medical!", pageWidth / 2, finalY + 40, {
    align: "center",
  });
  doc.text(
    "For any inquiries, contact support@dozamedical.com",
    pageWidth / 2,
    finalY + 46,
    { align: "center" },
  );

  doc.save(`DozaMedical_Order_${order.orderId}.pdf`);
}
