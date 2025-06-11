import React from 'react';
import { Link } from 'react-router-dom';

import userProfileImage from '../img/localplayer/PlayerImage.png';

function Header() {
  // Estado para o contador de turnos (será controlado por um componente pai)
  // Exemplo: const [turnCount, setTurnCount] = useState(1);
  const turnCount = 1; // Valor de exemplo

  // A função para passar o turno será recebida via props
  const handleNextTurn = () => {
    console.log('Passar Turno clicado!');
    // A lógica real será implementada no componente pai
  };

  return (
    <header className="p-3 mb-3 border-bottom">
      <div className="container">
        <div className="d-flex flex-wrap align-items-center justify-content-center justify-content-lg-start">
          <ul className="nav col-12 col-lg-auto me-lg-auto mb-2 justify-content-center mb-md-0">
            <Link to="/" className="nav-link px-2 link-light">Gs_DungeonMaster</Link>
            <Link to="/" id="btn-home" className="nav-link px-2 link-light">Inicio</Link>
            <Link to="/ficha" id="btn-ficha" className="nav-link px-2 link-light">Ficha</Link>
            <Link to="/acoes" id="btn-act" className="nav-link px-2 link-light">Ações</Link>
            <Link to="/inventario" id="btn-inv" className="nav-link px-2 link-light">Inventário</Link>
          </ul>

          {/* COMPONENTE DE TURNO COM CONTADOR E BOTÃO */}
          <div className="d-flex align-items-center me-3">
            <span className="text-light me-2">Turno:</span>
            <span id="turn-counter" className="badge bg-secondary me-3" style={{ fontSize: '1rem' }}>
              {turnCount}
            </span>
            <button id="btn-next-turn" className="btn btn-primary btn-sm" onClick={handleNextTurn}>
              Passar Turno
            </button>
          </div>

          <div className="dropdown text-end">
            {/* O GATILHO DO DROPDOWN */}
            <a href="#" className="d-block link-light text-decoration-none dropdown-toggle" id="dropdownUser1" data-bs-toggle="dropdown" aria-expanded="false">
              {/* Você pode usar uma imagem de perfil aqui */}
              <img src={userProfileImage} alt="mdo" width="32" height="32" className="rounded-circle" />
            </a>

            {/* O MENU DROPDOWN */}
            <ul className="dropdown-menu text-small" aria-labelledby="dropdownUser1">
              <li><Link to="/new-project" className="dropdown-item">New project...</Link></li>
              <li><Link to="/settings" className="dropdown-item">Settings</Link></li>
              <li><Link to="/profile" className="dropdown-item">Profile</Link></li>
              <li><hr className="dropdown-divider" /></li>
              <li><Link to="/signout" className="dropdown-item">Sign out</Link></li>
            </ul>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;