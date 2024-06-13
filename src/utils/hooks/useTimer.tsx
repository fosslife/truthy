import { useEffect, useState } from "react";

export function useTimer() {
  const [time, setTime] = useState(() => {
    let currentSeconds = Math.floor(Date.now() / 1000);
    return 30 - (currentSeconds % 30);
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const currentSeconds = Math.floor(Date.now() / 1000);
      const time = 30 - (currentSeconds % 30);
      setTime(time);
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return time;
}
