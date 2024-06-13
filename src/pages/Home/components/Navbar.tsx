import { ActionIcon, Button, Group, Stack, TextInput } from "@mantine/core";
import { IconSettings } from "@tabler/icons-react";
import { Sidebar } from "./Sidebar";
import { useDisclosure } from "@mantine/hooks";
import { ProgressBar } from "./Progress";

type NavbarProps = {
  openMainModal: () => void;
  search: string;
  setSearch: (s: string) => void;
  time: number;
};

export function Navbar({
  openMainModal,
  search,
  setSearch,
  time,
}: NavbarProps) {
  const [drawerOpened, { open, close }] = useDisclosure();
  return (
    <Stack gap={0}>
      <ProgressBar time={time} />
      <Group p="xs" justify="space-around" wrap="nowrap" pt="sm" style={{}}>
        <ActionIcon variant="filled" onClick={open}>
          <IconSettings />
        </ActionIcon>
        <TextInput
          radius={"sm"}
          placeholder="Search"
          value={search}
          flex={1}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />
        <Button rightSection={"+"} onClick={openMainModal} variant="filled">
          Add New{" "}
        </Button>

        <Sidebar closeDrawer={close} drawerOpened={drawerOpened} />
      </Group>
    </Stack>
  );
}
