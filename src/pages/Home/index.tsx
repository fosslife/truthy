import { Box, Grid, Stack, useMantineColorScheme } from "@mantine/core";
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
import { savedb } from "../../utils/kdbx";

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
  lastUsed?: Date;
};

export type SortType = "label" | "issuer" | "usage count" | "last used";

export type SortOrder = "asc" | "desc";

export default function Home() {
  const [search, setSearch] = useState<string>("");
  const [mainModalOpen, { open, close }] = useDisclosure();
  const { colorScheme } = useMantineColorScheme();

  const [sortType, setSortType] = useState<SortType>("label");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const time = useTimer();
  const [entries, setEntries] = useState<OtpObject[]>([]);
  const [latest, setLatest] = useState<any>(null);
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
    (async () => {
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
          lastUsed: entry.times.lastAccessTime,
        });

        if (entry.fields.get("islatest")) {
          setLatest(entry.fields.get("id")?.toString()!);
          entry.fields.delete("islatest");
          const updated = await db?.save();
          await savedb(updated);
        }
      }
      setEntries(temp);
      handleEntries(temp);
    })();
  }, [db, group?.entries, rerender]);

  useEffect(() => {
    if (latest) {
      document.getElementById("latest")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });
      const timeout = setTimeout(() => {
        setLatest(null);
      }, 5000);

      return () => clearTimeout(timeout);
    }
  }, [latest]);

  const handleSortType = (type: SortType, order?: SortOrder) => {
    setSortType(type);
    if (order) {
      setSortOrder(order);
    }
  };

  const memoisedEntries = useMemo(() => {
    return entries.map((e) => {
      if (!e.secret) return e;
      return {
        ...e,
        otp: TOTP.generate(e.secret).otp,
      };
    });
  }, [entries, time < 2]);

  const sortedEntries = useMemo(() => {
    return memoisedEntries.sort((a, b) => {
      if (sortType === "label") {
        return sortOrder === "asc"
          ? a.label.localeCompare(b.label)
          : b.label.localeCompare(a.label);
      } else if (sortType === "issuer") {
        return sortOrder === "asc"
          ? a.issuer.localeCompare(b.issuer)
          : b.issuer.localeCompare(a.issuer);
      } else if (sortType === "usage count") {
        return sortOrder === "asc"
          ? a.counter - b.counter
          : b.counter - a.counter;
      } else if (sortType === "last used") {
        return sortOrder === "asc"
          ? (a.lastUsed &&
              b.lastUsed &&
              a.lastUsed.getTime() - b.lastUsed.getTime()) ||
              0
          : (b.lastUsed &&
              a.lastUsed &&
              b.lastUsed.getTime() - a.lastUsed.getTime()) ||
              0;
      }
      return 0;
    });
  }, [memoisedEntries, sortType, sortOrder]);

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
        time={time}
        setSearch={(str) => setSearch(str.toLowerCase())}
        handleSortType={handleSortType}
      />
      <MainModal onClose={close} opened={mainModalOpen} />

      <Box
        style={{
          zIndex: 2,
          position: "fixed",
          bottom: 0,
          right: 0,
          top: 0,
          left: 0,
          backdropFilter: "brightness(0.3)",
          display: latest ? "block" : "none",
        }}
      ></Box>

      <Grid p="md" align="stretch" justify="start" style={{ height: "100%" }}>
        {sortedEntries
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
              <Card e={e} isLatest={e.id === latest}></Card>
            </Grid.Col>
          ))}
      </Grid>
    </Stack>
  );
}

// TODO: lock user after 3 failed attempts
// TODO: add logging for every step, exlude secrets
