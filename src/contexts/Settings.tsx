import { createContext, useContext, useEffect, useState } from "react";
import { useAppContext } from "./App";
import { savedb } from "../utils/kdbx";
import { baseColors } from "../utils/random";
import { useTheme } from "./Theme";

export type Settings = {
  blurMode: boolean;
  digitGrouping: string;
  minimizeOnCopy: boolean;
  view: "compact" | "card";
  theme: (typeof baseColors)[number];
};

type SettingsContext = {
  settings: Settings;
  setSettings: (settings: Settings) => void;
};

export const SettingsContext = createContext<SettingsContext>({
  settings: {} as Settings,
  setSettings: () => {},
});

const defaultSettings: Settings = {
  blurMode: false,
  digitGrouping: "3",
  minimizeOnCopy: false,
  view: "card",
  theme: "brand",
};

export const SettingsContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const { db, group } = useAppContext();
  const { changePrimaryColor } = useTheme();

  useEffect(() => {
    if (!db) return;
    db?.meta.customData?.set("settings", { value: JSON.stringify(settings) });

    db.save().then((content) => {
      savedb(content);
    });
  }, [settings]);

  useEffect(() => {
    async function init() {
      const settings = db?.meta.customData?.get("settings");
      if (settings) {
        const s = JSON.parse(settings.value!);
        setSettings(s);
        changePrimaryColor(s.theme);
        return;
      }
      setSettings({ ...defaultSettings });
    }
    init();
  }, [db, group]);

  return (
    <SettingsContext.Provider value={{ settings, setSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  return useContext(SettingsContext);
};
