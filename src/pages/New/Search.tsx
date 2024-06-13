import { TextInput } from "@mantine/core";
import { useDebouncedValue, useInputState } from "@mantine/hooks";
import { useEffect } from "react";

type Props = {
  onChange: (value: string) => void;
};

export function SearchBox({ onChange }: Props) {
  const [value, setValue] = useInputState("");
  const [debounced] = useDebouncedValue(value, 200);

  useEffect(() => {
    onChange(debounced);
  }, [debounced, onChange]);

  return (
    <TextInput
      label="Search"
      placeholder="Search icon"
      value={value}
      onChange={setValue}
    />
  );
}
