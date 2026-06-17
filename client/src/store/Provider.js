import React from 'react';
import AppContext from './Context';
export default function Provider({children}){
  const state = {};
  return <AppContext.Provider value={state}>{children}</AppContext.Provider>;
}
