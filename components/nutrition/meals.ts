import type { LucideIcon } from "lucide-react";
import { Coffee, Cookie, Soup, Utensils } from "lucide-react";
import type { MealName } from "@/components/dashboard/nutrition-diary-storage";

export const meals: Array<{
  name: MealName;
  icon: LucideIcon;
  accent: string;
}> = [
  { name: "Breakfast", icon: Coffee, accent: "bg-app-blue text-black" },
  { name: "Lunch", icon: Soup, accent: "bg-app-green text-black" },
  { name: "Dinner", icon: Utensils, accent: "bg-app-orange text-white" },
  { name: "Snacks", icon: Cookie, accent: "bg-app-purple text-white" }
];
