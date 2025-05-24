import React, { useState } from 'react';
import AttributesSection from './Atributos';
import CharacterPortraitAndHealth from './CharPortrait';
import SkillsSection from './Skills';
import token from '../../img/0.png'; // Verifique se o caminho da imagem está correto
import { BasicAttribute, EssentialAttributes, Skill } from '../../types'; // Importe todos os tipos necessários

const FullCharSheet: React.FC = () => {
  // Estado para controlar se estamos na "frente" ou "verso" da ficha
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');

  // Dados mockados (mantidos para o exemplo)
  const myCharacterAttributes: BasicAttribute[] = [
    { name: 'Força', value: 18, modifier: 4 },
    { name: 'Destreza', value: 16, modifier: 3 },
    { name: 'Constituição', value: 14, modifier: 2 },
    { name: 'Inteligência', value: 10, modifier: 0 },
    { name: 'Sabedoria', value: 12, modifier: 1 },
    { name: 'Carisma', value: 8, modifier: -1 },
  ];

  const mySkills: Skill[] = [
    { name: 'Acrobacia', modifier: '+3' },
    { name: 'Atletismo', modifier: '+5' },
    { name: 'Furtividade', modifier: '+2' },
    { name: 'Arcanismo', modifier: '+1' },
    { name: 'História', modifier: '+0' },
    { name: 'Investigação', modifier: '+1' },
    { name: 'Medicina', modifier: '+0' },
    { name: 'Natureza', modifier: '+1' },
    { name: 'Percepção', modifier: '+2' },
    { name: 'Performance', modifier: '+4' },
    { name: 'Persuasão', modifier: '+4' },
    { name: 'Religião', modifier: '+0' },
    { name: 'Prestidigitação', modifier: '+2' },
    { name: 'Sobrevivência', modifier: '+0' },
  ];

  const essentialAttributes: EssentialAttributes = {
    armor: 16,
    initiative: '+2',
    proficiency: '+2',
    speed: '9 m',
  };

  return (
    <div style={{ paddingTop: 5 }} className="container-fluid character-sheet-wrapper h-100"> {/* REMOVIDO vh-100, ADICIONADO h-100 */}
      <div className="row h-100 d-flex flex-column"> {/* Adicionado flex-column para organizar o header e o conteúdo */}

        {/* Abas de Frente e Verso da Ficha */}
        <div className="col-12 mb-3">
          <ul className="nav nav-tabs nav-justified" role="tablist">
            <li className="nav-item">
              <button
                className={`nav-link ${activeSide === 'front' ? 'active' : ''} text-white`}
                onClick={() => setActiveSide('front')}
                type="button"
                role="tab"
                aria-controls="front-tab-pane"
                aria-selected={activeSide === 'front'}
              >
                Frente da Ficha
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeSide === 'back' ? 'active' : ''} text-white`}
                onClick={() => setActiveSide('back')}
                type="button"
                role="tab"
                aria-controls="back-tab-pane"
                aria-selected={activeSide === 'back'}
              >
                Verso da Ficha
              </button>
            </li>
          </ul>
        </div>

        {/* Conteúdo da Ficha (Frente ou Verso) */}
        <div className="tab-content flex-grow-1 h-100">
          {activeSide === 'front' && (
            <div className="tab-pane fade show active h-100" id="front-tab-pane" role="tabpanel" aria-labelledby="front-tab">
              {/* Conteúdo original da ficha (3 colunas) */}
              <div className="row h-100">
                {/* COLUNA ESQUERDA: Atributos Básicos (col-md-3) */}
                <div className="col-md-3 d-flex flex-column align-items-center justify-content-start py-3 custom-scroll">
                  <AttributesSection attributes={myCharacterAttributes} />
                </div>

                {/* COLUNA DO MEIO: Perícias (col-md-5) */}
                <div className="col-md-5 d-flex flex-column py-3 custom-scroll">
                  <SkillsSection skills={mySkills} />
                </div>

                {/* COLUNA DA DIREITA: Imagem do Personagem e Vida (col-md-4) */}
                <div className="col-md-4 d-flex flex-column align-items-center justify-content-start py-3">
                  <CharacterPortraitAndHealth
                    imageUrl={token}
                    currentHealth={20}
                    maxHealth={100}
                  />
                  {/* Dados Essenciais */}
                  <div className="mt-4 text-center">
                    <h5 className="text-warning">Dados Essenciais</h5>
                    <div className="d-flex flex-wrap justify-content-center gap-2 mt-2">
                      <div className="card bg-transparent border-secondary text-white text-center p-2" style={{ minWidth: '100px' }}>
                        <h6 className="card-subtitle mb-0 text-white small">Armadura</h6>
                        <div className="font-weight-bold text-warning">{essentialAttributes.armor}</div>
                      </div>
                      <div className="card bg-transparent border-secondary text-white text-center p-2" style={{ minWidth: '100px' }}>
                        <h6 className="card-subtitle mb-0 text-white small">Iniciativa</h6>
                        <div className="font-weight-bold text-warning">{essentialAttributes.initiative}</div>
                      </div>
                      <div className="card bg-transparent border-secondary text-white text-center p-2" style={{ minWidth: '100px' }}>
                        <h6 className="card-subtitle mb-0 text-white small">Proeficiência</h6>
                        <div className="font-weight-bold text-warning">{essentialAttributes.proficiency}</div>
                      </div>
                      <div className="card bg-transparent border-secondary text-white text-center p-2" style={{ minWidth: '100px' }}>
                        <h6 className="card-subtitle mb-0 text-white small">Velocidade</h6>
                        <div className="font-weight-bold text-warning">{essentialAttributes.speed}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSide === 'back' && (
            <div className="tab-pane fade show active h-100" id="back-tab-pane" role="tabpanel" aria-labelledby="back-tab">
              {/* Conteúdo do Verso da Ficha - Adicione seus componentes aqui */}
              <div className="row h-100 justify-content-center align-items-center">
                <div className="col-12 text-center text-white">
                  <h3 className="text-warning mb-4">Verso da Ficha: Detalhes Adicionais</h3>
                  <div className="card bg-dark border-secondary p-4 mx-auto" style={{ maxWidth: '600px' }}>
                    <h5 className="text-white">História do Personagem</h5>
                    <p className="text-muted">
                      A história de Aella é marcada por batalhas em florestas sombrias e uma busca implacável por vingança contra os goblins que destruíram sua vila.
                    </p>
                    <h5 className="text-white mt-4">Equipamento</h5>
                    <ul className="list-group list-group-flush text-white bg-transparent">
                      <li className="list-group-item bg-transparent border-secondary text-white">Espada Longa de Aço</li>
                      <li className="list-group-item bg-transparent border-secondary text-white">Armadura de Couro Reforçado</li>
                      <li className="list-group-item bg-transparent border-secondary text-white">Mochila com suprimentos</li>
                    </ul>
                    <h5 className="text-white mt-4">Notas do Mestre</h5>
                    <textarea
                      className="form-control bg-dark text-white border-secondary"
                      rows={5}
                      placeholder="Adicione notas ou informações de roleplay aqui..."
                    ></textarea>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FullCharSheet;