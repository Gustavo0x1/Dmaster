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


  const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
  );

  root.render(
    
    <React.StrictMode>
      <meta httpEquiv="Content-Security-Policy" content="default-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;"></meta>

<HashRouter basename="/">
  <Routes>

      
    <Route path="/" element={<Layout />}>
      <Route path='/' element={<Home/>}/>
      <Route path='/acoes' element={<Actions/>}/>
      <Route path='/ficha' element={ <FullCharSheet></FullCharSheet>}/>
      <Route path='/inventario' element={<Inventory/>}/>



     </Route>
 
  </Routes>
</HashRouter>


    </React.StrictMode>,
  );

  // If you want to start measuring performance in your app, pass a function
  // to log results (for example: reportWebVitals(console.log))
  // or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
  reportWebVitals();
