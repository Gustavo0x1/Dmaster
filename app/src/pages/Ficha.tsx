import React from 'react';
import {SheetForm} from '../components/Forms/SheetForm'

export const Ficha: React.FC = () => {

    const electron = (window as any).electron;

    return <div>
        Inventario!!
        The home directory is{electron.homeDir()}
  <SheetForm></SheetForm>
        </div>
      
};
