import React from 'react';
import {Link} from 'react-router-dom'
import Omp from  '../img/0.png' 
function Header() {
  return (
    <header className="p-3 mb-3 border-bottom">
      <div className="container">
        <div className="d-flex flex-wrap align-items-center justify-content-center justify-content-lg-start">
        <ul className="nav col-12 col-lg-auto me-lg-auto mb-2 justify-content-center mb-md-0">
               <Link to="/"  className="nav-link px-2 link-light">Gs_DungeonMaster</Link>
               <Link to="/"  id="btn-home" className="nav-link px-2 link-light">Inicio</Link>
               <Link to="/ficha"  id="btn-ficha" className="nav-link px-2 link-light">Ficha</Link>
               <Link to="/inventario" id="btn-inv" className="nav-link px-2 link-light">Inventário</Link>
          </ul>

          <div className="dropdown text-end">
   
            <ul className="dropdown-menu text-small">
                 <Link to="/" className="dropdown-item" >New project... </Link>
                 <Link to="/" className="dropdown-item" >Settings </Link>
                 <Link to="/" className="dropdown-item" >Profile </Link>
                 <Link to="/">
                <hr className="dropdown-divider" />
              </Link>
                 <Link to="/" className="dropdown-item" >Sign out </Link>
            </ul>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
