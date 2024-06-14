import {
  Button,
  Divider,
  Drawer,
  Group,
  Select,
  Stack,
  Switch,
  Text,
  Title,
  rem,
  useMantineColorScheme,
  useMantineTheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconMoonStars, IconSun } from "@tabler/icons-react";
import { ImportModal } from "../../../components/Modals/ImportModal";
import { useSettings, Settings } from "../../../contexts/Settings";
import { ExportModal } from "../../../components/Modals/ExportModal";
import { ChangePasswordModal } from "../../../components/Modals/ChangePasswordModal";

type Props = {
  drawerOpened: boolean;
  closeDrawer: () => void;
};

export const Sidebar = ({ closeDrawer, drawerOpened }: Props) => {
  const { toggleColorScheme } = useMantineColorScheme();

  const [importOpen, { close: closeImport, open: openImport }] =
    useDisclosure();

  const [exportOpen, { close: closeExport, open: openExport }] =
    useDisclosure();

  const [
    changePasswordOpen,
    { close: closeChangePassword, open: openChangePassword },
  ] = useDisclosure();

  const { settings, setSettings } = useSettings();

  const theme = useMantineTheme();

  const saveAndMergeSettings = async (newSetting: Partial<Settings>) => {
    const newSettings = { ...settings, ...newSetting };
    setSettings(newSettings);
    return { ...settings, newSetting };
  };

  const sunIcon = (
    <IconSun
      style={{ width: rem(16), height: rem(16) }}
      stroke={2.5}
      color={theme.colors.yellow[4]}
    />
  );

  const moonIcon = (
    <IconMoonStars
      style={{ width: rem(16), height: rem(16) }}
      stroke={2.5}
      color={theme.colors.blue[6]}
    />
  );

  return (
    <Drawer
      offset={8}
      radius={"md"}
      opened={drawerOpened}
      onClose={closeDrawer}
      title="Settings"
    >
      <Stack>
        <Title c="brand" order={6}>
          Appearance
        </Title>
        <Group px="lg" justify="space-between">
          <Text>Colorscheme</Text>
          <Switch
            size="md"
            color="dark.4"
            onLabel={sunIcon}
            offLabel={moonIcon}
            onChange={toggleColorScheme}
          />
        </Group>
        <Group px="lg" justify="space-between">
          <Text>Blur digits</Text>
          <Switch
            size="md"
            onChange={() =>
              saveAndMergeSettings({ blurMode: !settings?.blurMode })
            }
            checked={settings?.blurMode}
          />
        </Group>
        <Group px="lg" justify="space-between">
          <Text>Digit grouping</Text>
          <Select
            w={"80"}
            allowDeselect={false}
            data={["2", "3"]}
            value={settings.digitGrouping.toString()}
            onChange={(e) => {
              saveAndMergeSettings({ digitGrouping: e! });
            }}
          />
        </Group>

        <Group px="lg" justify="space-between">
          <Text>View</Text>
          <Select
            w={"120"}
            allowDeselect={false}
            data={["compact", "card"]}
            value={settings.view}
            onChange={(e) => {
              saveAndMergeSettings({ view: e as "compact" | "card" });
            }}
          />
        </Group>

        <Divider />
        <Title c="brand" order={6}>
          Behaviour
        </Title>
        <Group px="lg" justify="space-between">
          <Text>Minimize on copy</Text>
          <Switch
            size="md"
            onChange={() =>
              saveAndMergeSettings({ minimizeOnCopy: !settings.minimizeOnCopy })
            }
            checked={settings.minimizeOnCopy}
          />
        </Group>
        <Divider />

        <Title c="brand" order={6}>
          Import / Export
        </Title>
        <Group>
          <Button onClick={openImport}>Import</Button>
          <Button onClick={openExport}>Export</Button>
        </Group>

        <Divider />

        <Title c="brand" order={6}>
          Security
        </Title>

        <Group>
          <Button onClick={openChangePassword}>Change master password</Button>
        </Group>
      </Stack>
      {/* planned settings:
        1. Export
        2. Change master password      
      */}

      <ImportModal
        isOpen={importOpen}
        onClose={closeImport}
        closeDrawer={closeDrawer}
      />

      <ExportModal isOpen={exportOpen} onClose={closeExport} />
      <ChangePasswordModal
        opened={changePasswordOpen}
        onClose={closeChangePassword}
        sidebarClose={closeDrawer}
      />
    </Drawer>
  );
};
