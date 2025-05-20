// v13.2
// fixed TOTP bypass security bug
// fixed TOTP reverification on app restart bug

import React, { createContext, useState, useContext, ReactNode, Dispatch, SetStateAction } from 'react';

interface AuthContextType {
  isTotpSessionVerified: boolean;
  setTotpSessionVerified: Dispatch<SetStateAction<boolean>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isTotpSessionVerified, setTotpSessionVerified] = useState(false);

  return (
    <AuthContext.Provider value={{ isTotpSessionVerified, setTotpSessionVerified }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};