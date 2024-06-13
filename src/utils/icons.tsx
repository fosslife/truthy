import { ActionIcon } from "@mantine/core";

export const modules = import.meta.glob<any>(["/src/icons/*.svg"], {
  query: "?react",
  import: "default",
  eager: true,
});

export const renderIcon = (key: string, size: number) => {
  const IconComponent = modules[key as keyof typeof modules];
  return (
    <ActionIcon radius="md" variant="transparent" size={size}>
      {" "}
      <IconComponent style={{ width: size - 12 }} />
    </ActionIcon>
  );
};
