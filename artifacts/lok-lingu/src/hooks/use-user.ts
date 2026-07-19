import { useState } from "react";

export function useUser() {
  const [userId, setUserId] = useState<number | null>(() => {
    const stored = localStorage.getItem("lok-lingu-userid");
    return stored ? parseInt(stored) : null;
  });
  const [username, setUsername] = useState<string>(() => {
    return localStorage.getItem("lok-lingu-username") || "";
  });

  const saveUser = (id: number, name: string) => {
    setUserId(id);
    setUsername(name);
    localStorage.setItem("lok-lingu-userid", id.toString());
    localStorage.setItem("lok-lingu-username", name);
  };

  return { userId, username, saveUser };
}
