/* eslint-disable no-unused-expressions */
import React from 'react';
  import ReactDOM from 'react-dom/client';
  import 'bootstrap/dist/css/bootstrap.min.css';
  import 'bootstrap/dist/js/bootstrap.min.js';
  import 'bootstrap-icons/font/bootstrap-icons.css';
  import './css/CharSheet/CharSheet.css'
  import './index.css';
  import reportWebVitals from './reportWebVitals';
  import {Route ,Routes, HashRouter,} from 'react-router-dom';
  import { Layout } from './components/Layout';
  import  {Inventory}  from './components/Inventory/Inventory';
  import {Actions} from './pages/Actions'
  import RPGGrid from './components/MainGrids';
  import FullCharSheet from './components/CharacterSheet/CharacterSheetManager';
import  Home  from './pages/Home';

import AppRouterAndAuth from './AppRouterAndAuth';

  const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
  );

  root.render(
    
    <>

      <AppRouterAndAuth></AppRouterAndAuth>


    </>,
  );

  // If you want to start measuring performance in your app, pass a function
  // to log results (for example: reportWebVitals(console.log))
  // or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
  reportWebVitals();
