  import React from 'react';
  import ReactDOM from 'react-dom/client';
  import 'bootstrap/dist/css/bootstrap.min.css';
  import 'bootstrap/dist/js/bootstrap.min.js';
  import './index.css';
  import reportWebVitals from './reportWebVitals';
  import {Route ,Routes, HashRouter,} from 'react-router-dom';
  import { Layout } from './components/Layout';
  import { Inventory } from './pages/Inventory';


  const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
  );
  root.render(
    
    <React.StrictMode>
      <meta httpEquiv="Content-Security-Policy" content="default-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;"></meta>
<HashRouter basename="/">
  <Routes>
   
      
    <Route path="/" element={<Layout />}>
      <Route path='/inventario' element={<Inventory/>}/>

      <Route path='/ficha' element={<Inventory/>}/>



     </Route>
 
  </Routes>
</HashRouter>


    </React.StrictMode>,
  );

  // If you want to start measuring performance in your app, pass a function
  // to log results (for example: reportWebVitals(console.log))
  // or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
  reportWebVitals();
