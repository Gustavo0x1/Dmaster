// Header.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useAudio } from '../components/AUDIO/MusicPlayer';
import { useTurn } from '../components/contexts/TurnContext'; // NEW: Import useTurn

import userProfileImagePlaceholder from '../img/localplayer/PlayerImage.png';

function Header() {
  // const turnCount = 1; // OLD: No longer needed here, will come from context

  // Usar o hook useAudio para acessar o contexto e as novas funções
  const { currentSongName, volume, setVolume, playMusic, pauseMusic, resumeMusic, isPlaying } = useAudio();
  // NEW: Use useTurn hook to get turn information
  const { currentTurnIndex, combatantsInTurnOrder, goToNextTurn } = useTurn();

  // NEW: Calculate turnCount from currentTurnIndex
  const turnCount = combatantsInTurnOrder.length > 0 ? currentTurnIndex + 1 : 0;


  const handleNextTurn = () => {
    console.log('Passar Turno clicado!');
    goToNextTurn(); // NEW: Call goToNextTurn from TurnContext
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      pauseMusic();
    } else {
      resumeMusic();
    }
  };

  return (
    <header className="p-3 mb-3 border-bottom bg-dark text-white">
      <div className="container-fluid">
        <div className="d-flex flex-wrap align-items-center justify-content-between">
          <ul className="nav me-auto mb-2 mb-md-0">
            <Link to="/" className="nav-link px-2 link-light">Gs_DungeonMaster</Link>
            <Link to="/" id="btn-home" className="nav-link px-2 link-light">Inicio</Link>
            <Link to="/ficha" id="btn-ficha" className="nav-link px-2 link-light">Ficha</Link>
            <Link to="/acoes" id="btn-act" className="nav-link px-2 link-light">Ações</Link>
            <Link to="/inventario" id="btn-inv" className="nav-link px-2 link-light">Inventário</Link>
          </ul>

          <div className="d-flex align-items-center me-3">
            <span className="text-light me-2 text-nowrap">Turno:</span>
            <span id="turn-counter" className="badge bg-secondary me-3" style={{ fontSize: '1rem' }}>
              {turnCount} {/* Displays current turn number based on currentTurnIndex */}
            </span>
            <button id="btn-next-turn" className="btn btn-primary btn-sm" onClick={handleNextTurn}>
              Passar Turno
            </button>
          </div>

          <div className="d-flex align-items-center bg-dark rounded-pill p-2 me-3 shadow-sm">
            <span className="text-light me-2 text-nowrap" style={{ fontSize: '0.85rem', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentSongName}
            </span>
            <button
              className="btn btn-sm btn-link text-light p-0 me-2"
              onClick={handlePlayPause}
              title={isPlaying ? "Pausar Música" : "Tocar Música"}
            >
              <i className={`bi ${isPlaying ? 'bi-pause-fill' : 'bi-play-fill'}`} style={{ fontSize: '1.2rem' }}></i>
            </button>
            <i className="bi bi-volume-up-fill text-light me-1"></i>
            <input
              type="range"
              min="0"
              max="0.1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              className="form-range"
              style={{ width: '80px' }}
            />
          </div>

          <div className="dropdown text-end ms-3">
            <a href="#" className="d-block link-light text-decoration-none dropdown-toggle" id="dropdownUser1" data-bs-toggle="dropdown" aria-expanded="false">
              <img src={userProfileImagePlaceholder} alt="User Profile" width="32" height="32" className="rounded-circle" />
            </a>
            <ul className="dropdown-menu text-small" aria-labelledby="dropdownUser1">
              <li><Link to="/new-project" className="dropdown-item">New project...</Link></li>
              <li><Link to="/settings" className="dropdown-item">Settings</Link></li>
              <li><hr className="dropdown-divider" /></li>
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