import { Progress } from "@mantine/core";

type ProgressBarProps = {
  time: number;
};

export function ProgressBar({ time }: ProgressBarProps) {
  return (
    <Progress.Root
      size={"lg"}
      radius={0}
      style={{
        backgroundColor: "white",
        //   position: "fixed",
        //   top: 0,
        //   left: 0,
        //   right: 0,
      }}
    >
      <Progress.Section
        value={(time / 30) * 100}
        style={{
          transition: `all ${time === 30 ? "10ms" : "1s"} linear`,
          // transition: "all 1s linear",
        }}
      >
        <Progress.Label>{time}s</Progress.Label>
      </Progress.Section>
    </Progress.Root>
  );
}
