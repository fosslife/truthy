import { nanoid } from "nanoid";

export const baseColors = [
  "gray",
  "red",
  "pink",
  "grape",
  "violet",
  "indigo",
  "blue",
  "cyan",
  "green",
  "lime",
  "yellow",
  "orange",
  "teal",
  "brand",
] as const;

export const colors = baseColors;

export function randomColor() {
  return colors[Math.floor(Math.random() * colors.length)];
}

export function getRandomId() {
  return nanoid(12);
}
