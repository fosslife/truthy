import {
  ActionIcon,
  Button,
  Group,
  Menu,
  Stack,
  TextInput,
  rem,
  useMantineColorScheme,
} from "@mantine/core";
import {
  IconBrandDaysCounter,
  IconCalendar,
  IconSettings,
  IconSortAZ,
  IconSortAscending,
  IconSortAscending2,
  IconSortDescending2,
  IconSortZA,
} from "@tabler/icons-react";
import { Sidebar } from "./Sidebar";
import { useDisclosure } from "@mantine/hooks";
import { ProgressBar } from "./Progress";
import { SortType, SortOrder } from "..";

type NavbarProps = {
  search: string;
  time: number;
  setSearch: (s: string) => void;
  openMainModal: () => void;
  handleSortType: (sortType: SortType, sortOrder?: SortOrder) => void;
};

export function Navbar({
  search,
  time,
  setSearch,
  openMainModal,
  handleSortType,
}: NavbarProps) {
  const [drawerOpened, { open, close }] = useDisclosure();
  const { colorScheme } = useMantineColorScheme();

  return (
    <Stack
      gap={0}
      pos={"sticky"}
      top={0}
      style={{
        zIndex: 2,
      }}
      bg={colorScheme === "dark" ? "dark.9" : "gray.2"}
    >
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
        <Menu shadow="md" width={150}>
          <Menu.Target>
            <ActionIcon variant="filled" size={"lg"}>
              <IconSortAscending />
            </ActionIcon>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Item
              onClick={() => handleSortType("label", "asc")}
              leftSection={
                <IconSortAZ style={{ width: rem(24), height: rem(24) }} />
              }
            >
              Label Asc
            </Menu.Item>

            <Menu.Item
              onClick={() => handleSortType("label", "desc")}
              leftSection={
                <IconSortZA style={{ width: rem(24), height: rem(24) }} />
              }
            >
              Label Desc
            </Menu.Item>

            <Menu.Item
              onClick={() => handleSortType("issuer", "asc")}
              leftSection={
                <IconSortAscending2
                  style={{ width: rem(24), height: rem(24) }}
                />
              }
            >
              Issuer Asc
            </Menu.Item>
            <Menu.Item
              onClick={() => handleSortType("issuer", "desc")}
              leftSection={
                <IconSortDescending2
                  style={{ width: rem(24), height: rem(24) }}
                />
              }
            >
              Issuer Desc
            </Menu.Item>

            <Menu.Item
              disabled
              onClick={() => handleSortType("usage count")}
              leftSection={
                <IconBrandDaysCounter
                  style={{ width: rem(24), height: rem(24) }}
                />
              }
            >
              Most used
            </Menu.Item>
            <Menu.Item
              disabled
              onClick={() => handleSortType("last used")}
              leftSection={
                <IconCalendar style={{ width: rem(24), height: rem(24) }} />
              }
            >
              Last used
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
        <Button rightSection={"+"} onClick={openMainModal} variant="filled">
          Add New{" "}
        </Button>

        <Sidebar closeDrawer={close} drawerOpened={drawerOpened} />
      </Group>
    </Stack>
  );
}
