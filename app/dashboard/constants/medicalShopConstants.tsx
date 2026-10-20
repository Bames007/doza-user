// app/dashboard/components/medicalshop/constants.tsx
import {
  Activity,
  Heart,
  Filter,
  CreditCard,
  Package,
  Stethoscope,
} from "lucide-react";

export const CATEGORIES = [
  "All",
  "Monitoring Devices",
  "Mobility Aids",
  "First Aid",
  "Personal Care",
  "Fitness & Wellness",
  "Respiratory & Sleep",
] as const;

export type CategoryFilter = (typeof CATEGORIES)[number];

export const HELP_SLIDES = [
  {
    icon: <Activity className="w-10 h-10 text-emerald-600" />,
    title: "Find Medical Gear",
    description:
      "Browse categories or search for specific devices and supplies.",
  },
  {
    icon: <Heart className="w-10 h-10 text-emerald-600" />,
    title: "Save Favourites",
    description: "Tap the heart to save items for later.",
  },
  {
    icon: <Filter className="w-10 h-10 text-emerald-600" />,
    title: "Filter by Needs",
    description:
      "Narrow by category, size, price, or prescription requirement.",
  },
  {
    icon: <CreditCard className="w-10 h-10 text-emerald-600" />,
    title: "Secure Checkout",
    description: "Add delivery address and choose payment method.",
  },
  {
    icon: <Package className="w-10 h-10 text-emerald-600" />,
    title: "Track Your Order",
    description: "Monitor order status in the Orders tab.",
  },
  {
    icon: <Stethoscope className="w-10 h-10 text-emerald-600" />,
    title: "Prescription Items",
    description: "Some products require a prescription — we'll guide you.",
  },
];

export const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2";
