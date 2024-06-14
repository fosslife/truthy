import { Grid, Stack, useMantineColorScheme } from "@mantine/core";
import { Navbar } from "./components/Navbar";
import { useTimer } from "../../utils/hooks/useTimer";
import { useAppContext } from "../../contexts/App";
import { Navigate, useNavigate } from "react-router-dom";
import { useDisclosure, useIdle } from "@mantine/hooks";
import { MainModal } from "../../components/Modals/MainModal";
import { useEffect, useMemo, useState } from "react";
import { TOTP } from "totp-generator";
import { Card } from "./components/Card";
import { useSettings } from "../../contexts/Settings";

export type OtpObject = {
  id: string;
  label: string;
  issuer: string;
  secret: string;
  algorithm: string;
  digits: number;
  counter: number;
  period: number;
  icon?: string;
  otp?: string;
  color?: string;
};

export default function Home() {
  const [search, setSearch] = useState<string>("");
  const [mainModalOpen, { open, close }] = useDisclosure();
  const { colorScheme } = useMantineColorScheme();

  const time = useTimer();
  const [entries, setEntries] = useState<OtpObject[]>([]);
  const nav = useNavigate();

  const idle = useIdle(import.meta.env.DEV ? 5000000 : 50 * 1000, {
    initialState: false,
  });

  const { db, group, rerender, handleEntries } = useAppContext();
  const { settings } = useSettings();

  useEffect(() => {
    if (idle) {
      nav("/", { replace: true });
    }
  }, [idle]);

  useEffect(() => {
    (() => {
      if (!group) return;
      let temp: OtpObject[] = [];
      for (const entry of group?.entries) {
        temp.push({
          id: entry.fields.get("id")?.toString()!,
          label: entry.fields.get("label")?.toString()!,
          issuer: entry.fields.get("issuer")?.toString()!,
          secret: entry.fields.get("secret")?.toString()!,
          algorithm: entry.fields.get("algorithm")?.toString()!,
          digits: Number(entry.fields.get("digits")?.toString() || 6),
          counter: Number(entry.fields.get("counter")?.toString() || 0),
          period: Number(entry.fields.get("period")?.toString() || 30),
          icon: entry.fields.get("icon")?.toString()!,
          otp: "",
          color: entry.fields.get("color")?.toString()!,
        });
      }
      setEntries(temp);
      handleEntries(temp);
    })();
  }, [db, group?.entries, rerender]);

  const memoisedEntries = useMemo(() => {
    return entries.map((e) => {
      if (!e.secret) return e;
      return {
        ...e,
        otp: TOTP.generate(e.secret).otp,
      };
    });
  }, [entries, time < 2]);

  if (!db) {
    return <Navigate to="/" />;
  }
  return (
    <Stack
      h="100%"
      bg={colorScheme === "dark" ? "dark.9" : "white"}
      style={{
        overflow: "auto",
      }}
    >
      <Navbar
        openMainModal={open}
        search={search}
        setSearch={(str) => setSearch(str.toLowerCase())}
        time={time}
      />
      <MainModal onClose={close} opened={mainModalOpen} />

      <Grid p="md" align="stretch" justify="start" style={{ height: "100%" }}>
        {memoisedEntries
          .filter(
            (e) =>
              e.label.toLowerCase().includes(search) ||
              e.issuer.toLowerCase().includes(search)
          )
          .map((e) => (
            <Grid.Col
              key={e.id}
              span={
                settings.view === "compact"
                  ? 12
                  : {
                      base: 12,
                      sm: 6,
                      md: 4,
                      lg: 3,
                    }
              }
            >
              <Card e={e}></Card>
            </Grid.Col>
          ))}
      </Grid>
    </Stack>
  );
}

// TODO: view mode: compact, tiles, cards etc.
// TODO: add settings
// TODO: advance config for OTP
// TODO: tap to reveal
// TODO: support `note`
// TODO: lock user after 3 failed attempts
// TODO: 3 wrong attemps locks out for 5 minutes?
// TODO: search
// TODO: add logging for every step, exlude secrets
