import type { LucideIcon } from "lucide-react";
import { Coffee, Cookie, Soup, Utensils } from "lucide-react";
import type { MealName } from "./nutrition-diary-storage";

export const meals: Array<{
  name: MealName;
  icon: LucideIcon;
  accent: string;
}> = [
  { name: "Breakfast", icon: Coffee, accent: "bg-black/30 text-cds-interactive" },
  { name: "Lunch", icon: Soup, accent: "bg-black/30 text-cds-interactive" },
  { name: "Dinner", icon: Utensils, accent: "bg-black/30 text-cds-interactive" },
  { name: "Snacks", icon: Cookie, accent: "bg-black/30 text-cds-interactive" }
];
