import {
  ActionIcon,
  Avatar,
  Box,
  Button,
  Divider,
  Group,
  Modal,
  Stack,
  TextInput,
  Tooltip,
  useMantineColorScheme,
} from "@mantine/core";
import { parseOTPAuthURL } from "../../utils/parseOtpAuthURL";
import {
  useDebouncedState,
  useDisclosure,
  useIdle,
  useInputState,
  useMediaQuery,
} from "@mantine/hooks";
import { useState, useEffect } from "react";

import { TOTP } from "totp-generator";

import { OtpObject } from "../Home";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { IconArrowLeft, IconEdit } from "@tabler/icons-react";
import { randomColor } from "../../utils/random";
import { getRandomId } from "../../utils/random";

import classes from "./New.module.css";
import { SearchBox } from "./Search";
import { modules, renderIcon } from "../../utils/icons";
import { useAppContext } from "../../contexts/App";
import { savedb } from "../../utils/kdbx";
import { recordEntity } from "../../utils/entryops";

function EntryDetails() {
  const [label, setLabel] = useInputState("");
  const [secret, setSecret] = useInputState("");
  const [issuer, setIssuer] = useInputState("");

  const [opened, { open, close }] = useDisclosure();
  const [iconSearch, setIconSearch] = useDebouncedState("", 500);

  const nav = useNavigate();
  const params = useParams<{ id: string }>();

  const { db, group } = useAppContext();

  // TODO: add support for these
  const algorithm = "SHA-1";
  const digits = 6;
  const period = 30;

  const isEditing = params.id !== undefined;

  const [uri, setUri] = useState("");
  const [color, setColor] = useState("blue");
  const [icon, setIcon] = useState<any>("");

  const breakpoint = useMediaQuery("(min-width: 768px)");
  const { colorScheme } = useMantineColorScheme();

  const idle = useIdle(import.meta.env.DEV ? 5000000 : 50 * 1000, {
    initialState: false,
  });

  useEffect(() => {
    if (idle) {
      nav("/", { replace: true });
    }
  }, [idle]);

  useEffect(() => {
    if (params.id !== undefined) {
      const e = group?.entries.find((e) => e.fields.get("id") === params.id);
      if (e) {
        setLabel(e.fields.get("label")!?.toString());
        setSecret(e.fields.get("secret")!?.toString());
        setIssuer(e.fields.get("issuer")!?.toString());
        setColor(e.fields.get("color")!?.toString());
        setIcon(e.fields.get("icon")!?.toString());
      }
    }
  }, [params.id, group]);

  const saveManual = async () => {
    if (isEditing) {
      const entry = group?.entries.find(
        (e) => e.fields.get("id") === params.id
      );

      entry?.fields.set("label", label);
      entry?.fields.set("issuer", issuer);
      entry?.fields.set("secret", secret);
      entry?.fields.set("icon", icon);
      entry?.fields.set("color", color);

      entry?.times.update();

      const save = await db?.save();
      await savedb(save);

      nav("/home", { replace: true });
      return;
    }

    let newEntry: OtpObject = {
      label,
      issuer,
      algorithm,
      digits,
      period,
      id: getRandomId(),
      secret,
      counter: 0,
      icon: icon,
      color,
      otp: TOTP.generate(secret).otp,
    };

    const entry = db?.createEntry(group!);

    recordEntity(newEntry, entry!);

    const save = await db?.save();
    await savedb(save);

    nav("/home", { replace: true });
  };

  const deleteEntry = async () => {
    const confirmation = await confirm(
      "Deleting entry is irreversible. Are you sure?"
    );
    if (confirmation) {
      const entry = group?.entries.find(
        (e) => e.fields.get("id") === params.id
      );
      if (entry) {
        db?.remove(entry);
        const save = await db?.save();
        await savedb(save);
        nav("/home", { replace: true });
      }
    }
  };

  if (!db) {
    return <Navigate to="/" />;
  }

  return (
    <Group
      justify="center"
      p="md"
      align="start"
      h="100%"
      bg={colorScheme === "dark" ? "dark.9" : "white"}
    >
      <Box pos={"absolute"} left={20}>
        <ActionIcon
          variant="transparent"
          color="gray"
          onClick={() => {
            nav("/home", { replace: true });
          }}
        >
          <IconArrowLeft />
        </ActionIcon>
      </Box>
      <Group p="xl">
        <Avatar
          size={breakpoint ? 220 : "xl"}
          color={color}
          radius={"md"}
          className={classes.avatar}
        >
          {icon
            ? renderIcon(icon, 128)
            : issuer
            ? issuer[0].toUpperCase()
            : label[0]?.toUpperCase() || "A"}
          <ActionIcon radius={"lg"} className={classes.editIcon} onClick={open}>
            <IconEdit />
          </ActionIcon>
        </Avatar>
      </Group>
      <Stack p="xl" w={breakpoint ? "40%" : "100%"}>
        {!isEditing && (
          <>
            {" "}
            <TextInput
              label="URI"
              required
              placeholder={"otpauth://totp/label?secret=secret"}
              value={uri}
              onChange={(e) => {
                setUri(e.currentTarget.value);
                const parsed = parseOTPAuthURL(e.currentTarget.value);
                setLabel(parsed.label);
                setSecret(parsed.secret);
                setIssuer(parsed.issuer);
              }}
            />
            <Divider label="or" />
          </>
        )}

        <TextInput
          label="Label"
          required
          placeholder="Label"
          value={label}
          onChange={(e) => {
            setColor(randomColor());
            setLabel(e);
          }}
          disabled={isEditing}
        />

        <TextInput
          label="Issuer"
          placeholder="Issuer"
          value={issuer}
          onChange={(e) => {
            setColor(randomColor());
            setIssuer(e);
          }}
        />
        <TextInput
          label="Secret"
          required
          placeholder="Secret"
          value={secret}
          onChange={setSecret}
        />

        <Button
          disabled={!label || !secret}
          onClick={saveManual}
          variant="light"
        >
          {isEditing ? "Save" : "Add"}
        </Button>
        {isEditing && (
          <Button color="red" onClick={deleteEntry} variant="light">
            Delete
          </Button>
        )}
      </Stack>

      <Modal opened={opened} onClose={close} title="Pick icon">
        <Stack>
          <SearchBox onChange={setIconSearch} />
          <Group justify="center">
            {Object.keys(modules)
              .filter((e) => e.toLowerCase().includes(iconSearch.toLowerCase()))
              .map((key) => {
                return (
                  <div
                    key={key}
                    onClick={() => {
                      setIcon(key);
                      close();
                    }}
                  >
                    <Tooltip label={key.split("/")[3]}>
                      {renderIcon(key, 60)}
                    </Tooltip>
                  </div>
                );
              })}
          </Group>
        </Stack>
      </Modal>
    </Group>
  );
}

export default EntryDetails;
