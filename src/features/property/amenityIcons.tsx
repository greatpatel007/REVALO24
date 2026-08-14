import {
  ArrowsDownUp, Car, Check, Columns, CookingPot, Leaf, Stairs, Tree, Waves, WifiHigh, Wind,
} from "@phosphor-icons/react";

type AmenityIcon = typeof Tree;

/** Phosphor map for listing amenity chips — exact names match `AMENITIES` in mock db. */
export const AMENITY_ICONS: Record<string, AmenityIcon> = {
  Balcony: Columns,
  Garden: Tree,
  Parking: Car,
  Elevator: ArrowsDownUp,
  AC: Wind,
  Pool: Waves,
  "Fitted kitchen": CookingPot,
  Cellar: Stairs,
  "Fibre internet": WifiHigh,
  "Quiet courtyard": Leaf,
};

export function amenityIcon(name: string): AmenityIcon {
  return AMENITY_ICONS[name] ?? Check;
}
