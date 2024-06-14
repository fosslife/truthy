import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import kdbxweb from "../utils/kdbx";
import { OtpObject } from "../pages/Home";

type AppContextType = {
  db: kdbxweb.Kdbx | null;
  group: kdbxweb.KdbxGroup | null;
  rerender: number;
  entries: OtpObject[];
  handleEntries: (entries: OtpObject[]) => void;
  forceRerender: () => void;
  loadDb: (db: kdbxweb.Kdbx) => void;
};

const AppContext = createContext<AppContextType>({
  db: null,
  rerender: 0,
  group: null,
  entries: [],
  handleEntries: () => {},
  forceRerender: () => {},
  loadDb: () => {},
});

export const AppContextProvider = ({ children }: PropsWithChildren) => {
  const [db, setDb] = useState<kdbxweb.Kdbx | null>(null);
  const [rerender, rerenderHack] = useState(0);
  const [group, setGroup] = useState<kdbxweb.KdbxGroup | null>(null);
  const [entries, setEntries] = useState<OtpObject[]>([]);

  const loadDb = async (db: kdbxweb.Kdbx) => {
    setDb(db);
    const group = db.getDefaultGroup();
    setGroup(group);
  };

  useEffect(() => {
    if (db) {
      const group = db.getDefaultGroup();
      setGroup(group);
    }
  }, [db]);

  const forceRerender = () => {
    rerenderHack((prev) => prev + 1);
  };

  const handleEntries = (entries: OtpObject[]) => {
    setEntries([...entries]);
  };

  return (
    <AppContext.Provider
      value={{
        db,
        group,
        rerender,
        entries,
        handleEntries,
        forceRerender,
        loadDb: loadDb,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  return useContext(AppContext);
};
