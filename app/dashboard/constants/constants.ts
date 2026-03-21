import { Plan } from "@/app/types";

export const plans: Plan[] = [
  {
    id: "basic",
    name: "Basic",
    price: "₦5,000/month",
    tagline: "Essential health management",
    benefits: [
      "Personal Medical Records (PMR) – store & access your health info securely",
      "Find verified centers near you with available spaces",
      "Emergency center availability alerts – know where to go",
      "Health planner & medication reminders",
      "Drug tracker for you",
    ],
  },
  {
    id: "plus",
    name: "Plus",
    price: "₦15,000/month",
    tagline: "Convenience & access",
    benefits: [
      "Everything in Basic",
      "Order drugs anywhere – delivered to your doorstep",
      "Real-time directions to centers (maps & navigation)",
      "Search centers by your specific medical case",
      "Geolocation-based center finder",
      "Priority support",
    ],
    highlighted: true,
  },
  {
    id: "premium",
    name: "Premium",
    price: "₦30,000/month",
    tagline: "Complete family care",
    benefits: [
      "Everything in Plus",
      "Family plan – cover up to 5 members",
      "Drug tracker for entire family",
      "Advanced health planners for each member",
      "Exclusive discounts on medications",
      "24/7 dedicated health assistant",
    ],
  },
];
