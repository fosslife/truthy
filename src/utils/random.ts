import { nanoid } from "nanoid";

const colorshade = [4, 5, 6, 7, 8, 9];

export const colors = [
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
].map(
  (c) => `${c}.${colorshade[Math.floor(Math.random() * colorshade.length)]}`
);

export function randomColor() {
  return colors[Math.floor(Math.random() * colors.length)];
}

export function getRandomId() {
  return nanoid(12);
}
