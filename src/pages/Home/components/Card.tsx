import {
  ActionIcon,
  Avatar,
  Box,
  CopyButton,
  Flex,
  Group,
  Paper,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import classes from "./Card.module.css";
import { IconCheck, IconCopy, IconEdit } from "@tabler/icons-react";
import { OtpObject } from "..";
import { clipboard } from "@tauri-apps/api";
import { appWindow } from "@tauri-apps/api/window";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../../../contexts/Settings";
import { renderIcon } from "../../../utils/icons";

type CardProps = {
  isLatest: boolean;
  e: OtpObject;
};

export function Card({ e, isLatest }: CardProps) {
  const nav = useNavigate();

  const { settings } = useSettings();

  const viewMode = settings.view;

  const regexString = new RegExp(
    `(\\d)(?=(\\d{${settings.digitGrouping}})+(?!\\d))`,
    "g"
  );

  if (viewMode === "compact") {
    return (
      <Paper
        withBorder
        shadow="xs"
        radius="md"
        p="xs"
        className={classes.compactCard}
        onClick={() => nav(`/edit/${e.id}`, { replace: true })}
      >
        <Group justify="space-between" align="center" wrap="nowrap">
          <Group>
            <Avatar radius="xs" size={"md"} color={e.color}>
              {e.icon
                ? renderIcon(e.icon, 60)
                : e.issuer
                ? e.issuer[0].toUpperCase()
                : e.label[0].toUpperCase()}
            </Avatar>
            <Stack gap={0}>
              <Title order={6}>
                {decodeURIComponent(e.issuer ? e.issuer : e.label || "")}
              </Title>
              <Text>{decodeURIComponent(!e.issuer ? "" : e.label)}</Text>
            </Stack>
          </Group>
          <Box className={settings?.blurMode ? classes.blur : undefined}>
            {e.otp?.replace(regexString, "$1 ")}
          </Box>
        </Group>
      </Paper>
    );
  }

  return (
    <Paper
      withBorder
      shadow="xs"
      radius="md"
      p="xl"
      className={classes.card}
      h="100%"
      id={isLatest ? "latest" : undefined}
      style={{
        zIndex: isLatest ? 3 : undefined,
        overflow: "hidden",
      }}
    >
      {/* show otp in group of 2's */}
      <Group gap="lg" wrap="nowrap">
        <Avatar radius="md" size={"xl"} color={e.color}>
          {e.icon
            ? renderIcon(e.icon, 60)
            : e.issuer
            ? e.issuer[0].toUpperCase()
            : e.label[0].toUpperCase()}
        </Avatar>
        <Flex wrap="nowrap" direction={"column"}>
          <Title
            textWrap="nowrap"
            className={settings?.blurMode ? classes.blur : undefined}
          >
            {e.otp?.replace(regexString, "$1 ")}
          </Title>
          {e.issuer ? (
            <>
              <Text fw="bolder" size="16px" pt="5px">
                {decodeURIComponent(e.issuer)}
              </Text>
              <Tooltip label={e.label} position="bottom">
                <Text size="sm">{decodeURIComponent(e.label || "")}</Text>
              </Tooltip>
            </>
          ) : (
            <Tooltip label={e.label} position="bottom">
              <Text>{decodeURIComponent(e.label || "")} </Text>
            </Tooltip>
          )}
        </Flex>
      </Group>
      <ActionIcon
        variant="light"
        className={classes.editIcon}
        onClick={() => nav(`/edit/${e.id}`, { replace: true })}
      >
        <IconEdit />
      </ActionIcon>

      <CopyButton value={e.otp!} timeout={2000}>
        {({ copied, copy }) => (
          <ActionIcon
            variant="light"
            className={classes.copyIcon}
            color={copied ? "teal" : undefined}
            onClick={async () => {
              copy();
              e.entry?.fields.set("counter", (e.counter + 1).toString());
              e.entry?.times.update();
              await clipboard.writeText(e.otp!);
              if (settings.minimizeOnCopy) {
                appWindow.minimize();
              }
            }}
          >
            {copied ? <IconCheck /> : <IconCopy />}
          </ActionIcon>
        )}
      </CopyButton>
    </Paper>
  );
}
