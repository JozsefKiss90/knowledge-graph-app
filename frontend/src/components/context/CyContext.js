import { createContext, useContext } from "react";

export const CyContext = createContext(null);

export const useCy = () => useContext(CyContext);
