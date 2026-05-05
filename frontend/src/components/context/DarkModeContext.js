import React, { createContext, useContext, useState } from 'react';

export const DarkModeContext = createContext();

export const DarkModeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(true);
  return (
    <DarkModeContext.Provider value={{ darkMode, setDarkMode }}>
      <div className={darkMode ? 'dark-theme' : 'light-theme'}>
        {children}
      </div>
    </DarkModeContext.Provider>
  );
};

export const useDarkMode = () => useContext(DarkModeContext);
