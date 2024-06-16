import {
  MantineColorsTuple,
  MantineProvider,
  createTheme,
} from "@mantine/core";
import { PropsWithChildren, createContext, useContext, useState } from "react";

type ThemeContextType = {
  color: string;
  changePrimaryColor: (color: string) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  color: "blue",
  changePrimaryColor: () => {},
});

const brand: MantineColorsTuple = [
  "#ffeaf3",
  "#fdd4e1",
  "#f4a7bf",
  "#ec779c",
  "#e64f7e",
  "#e3356b",
  "#e22762",
  "#c91a52",
  "#b41149",
  "#9f003e",
];

export const ThemeProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [primaryColor, setPrimaryColor] = useState<string>("brand");

  const theme = createTheme({
    primaryColor,
    colors: {
      brand,
    },
  });

  const changePrimaryColor = (color: string) => {
    setPrimaryColor(color);
  };

  return (
    <ThemeContext.Provider value={{ color: primaryColor, changePrimaryColor }}>
      <MantineProvider defaultColorScheme={"dark"} theme={theme}>
        {children}
      </MantineProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  return useContext(ThemeContext);
};
