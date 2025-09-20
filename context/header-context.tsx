import React, { createContext, useContext, useState } from "react";

interface HeaderContextType {
  title: string;
  setTitle: (title: string) => void;
  showBack: boolean;
  setShowBack: (show: boolean) => void;
  show: boolean;
  setShow: (show: boolean) => void;
}

const HeaderContext = createContext<HeaderContextType | undefined>(undefined);

export const HeaderProvider = ({ children }: { children: React.ReactNode }) => {
  const [title, setTitle] = useState("");
  const [showBack, setShowBack] = useState(false);
  const [show, setShow] = useState(true);
  return (
    <HeaderContext.Provider value={{ title, setTitle, showBack, setShowBack, show, setShow }}>
      {children}
    </HeaderContext.Provider>
  );
};

export function useHeader() {
  const context = useContext(HeaderContext);
  if (!context) {
    throw new Error("useHeader must be used within a HeaderProvider");
  }
  return context;
}
