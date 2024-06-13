import {
  Button,
  Checkbox,
  Divider,
  Drawer,
  Group,
  Radio,
  Stack,
  Switch,
  rem,
  useMantineColorScheme,
  useMantineTheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconMoonStars, IconSun } from "@tabler/icons-react";
import { ImportModal } from "../../../components/Modals/ImportModal";
import { useSettings, Settings } from "../../../contexts/Settings";

type Props = {
  drawerOpened: boolean;
  closeDrawer: () => void;
};

export const Sidebar = ({ closeDrawer, drawerOpened }: Props) => {
  const { toggleColorScheme } = useMantineColorScheme();

  const [importOpen, { close: closeImport, open: openImport }] =
    useDisclosure();

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
      //   size={"xs"}
      opened={drawerOpened}
      onClose={closeDrawer}
      title="Settings"
    >
      <Stack>
        <Switch
          size="md"
          color="dark.4"
          onLabel={moonIcon}
          offLabel={sunIcon}
          onChange={toggleColorScheme}
          label="Theme"
        />
        <Divider />
        <Switch
          size="md"
          onChange={() =>
            saveAndMergeSettings({ blurMode: !settings?.blurMode })
          }
          checked={settings?.blurMode}
          label="Blur mode"
        />
        <Divider />
        <Radio.Group
          label="Digits grouping"
          value={settings.digitGrouping.toString()}
          onChange={(e) => saveAndMergeSettings({ digitGrouping: e })}
        >
          <Group>
            <Radio value={"2"} label="2" />
            <Radio value={"3"} label="3" />
          </Group>
        </Radio.Group>
        <Divider />
        <Checkbox
          checked={settings.minimizeOnCopy}
          onChange={() =>
            saveAndMergeSettings({ minimizeOnCopy: !settings.minimizeOnCopy })
          }
          label="Minimize on copy"
        />

        <Group>
          <Button onClick={openImport}>Import</Button>
        </Group>
      </Stack>
      {/* planned settings:
        1. Export/Import
        2. Change master password
        3. Backup
        4. Spacing between numbers
        5. Dark mode
        6. Auto lock
      
      */}

      <ImportModal
        isOpen={importOpen}
        onClose={closeImport}
        closeDrawer={closeDrawer}
      />
    </Drawer>
  );
};
