const DEFAULT_WEIGHT_KG = 70;
const POUNDS_PER_KILOGRAM = 2.2046226218;

const metByActivityType: Record<string, number> = {
  alpineSki: 5.5,
  backcountrySki: 7,
  canoeing: 5,
  crossfit: 8,
  eBikeRide: 5.5,
  elliptical: 5,
  gravelRide: 8.5,
  handcycle: 5,
  hike: 6,
  iceSkate: 7,
  inlineSkate: 7.5,
  kayak: 5,
  kitesurf: 6,
  mountainBikeRide: 8.5,
  nordicSki: 9,
  pickleball: 5,
  pilates: 3,
  racquetball: 7,
  ride: 8,
  rockClimbing: 8,
  rollerSki: 8,
  rowing: 7,
  run: 9.8,
  sail: 3,
  skateboarding: 5,
  snowboard: 5.3,
  snowshoe: 8,
  soccer: 7,
  squash: 7.3,
  stairStepper: 8,
  standUpPaddling: 4,
  surf: 3,
  swim: 8,
  tableTennis: 4,
  tennis: 7,
  trailRun: 10.5,
  velomobile: 8,
  virtualRide: 8,
  virtualRow: 7,
  virtualRun: 9.8,
  walk: 3.5,
  weightTraining: 4,
  wheelchair: 4,
  workout: 6,
  yoga: 2.5
};

function normalizeActivityType(type: string) {
  return type
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+(\w)/g, (_match: string, letter: string) =>
      letter.toUpperCase()
    );
}

function getMetForActivityType(type: string) {
  return metByActivityType[normalizeActivityType(type)] ?? 6;
}

export function getActivityWeightKg({
  units,
  weight
}: {
  units?: string | null;
  weight?: number | null;
}) {
  if (typeof weight !== "number" || !Number.isFinite(weight) || weight <= 0) {
    return DEFAULT_WEIGHT_KG;
  }

  return units === "metric" ? weight : weight / POUNDS_PER_KILOGRAM;
}

export function estimateActivityCalories({
  movingTime,
  type,
  weightKg
}: {
  movingTime: number | null;
  type: string;
  weightKg: number;
}) {
  if (!movingTime || movingTime <= 0 || weightKg <= 0) {
    return 0;
  }

  const minutes = movingTime / 60;
  const met = getMetForActivityType(type);

  return Math.round((met * 3.5 * weightKg * minutes) / 200);
}

export function getActivityCalories({
  calories,
  movingTime,
  type,
  weightKg
}: {
  calories: number | null;
  movingTime: number | null;
  type: string;
  weightKg: number;
}) {
  if (typeof calories === "number" && Number.isFinite(calories) && calories > 0) {
    return Math.round(calories);
  }

  return estimateActivityCalories({
    movingTime,
    type,
    weightKg
  });
}
