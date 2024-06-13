import { createContext, useContext, useEffect, useState } from "react";
import { useAppContext } from "./App";
import { savedb } from "../utils/kdbx";

export type Settings = {
  blurMode: boolean;
  digitGrouping: string;
  minimizeOnCopy: boolean;
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
  digitGrouping: "2",
  minimizeOnCopy: false,
};

export const SettingsContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const { db, group } = useAppContext();

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
        setSettings(JSON.parse(settings.value!));
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
