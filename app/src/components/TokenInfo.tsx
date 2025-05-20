import React from 'react'


interface TokenInfoProps {
  src: string; // Caminho ou URL da imagem
  id:number; // Texto alternativo para acessibilidade
  posx:number; // Texto alternativo para acessibilidade
  posy:number; // Texto alternativo para acessibilidade
  
  }

const TokenInfo: React.FC<TokenInfoProps> = ({
  src,id,posx,posy

}) => {

  return (
    <div>
      <img className="w-25" src={src} />
        <p>id={id}</p>
        <p>({posx},{posy})</p>
    </div>
  );
};

export default TokenInfo