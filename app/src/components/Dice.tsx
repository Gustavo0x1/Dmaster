// Dice.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import DiceBox from './dice-box-threejs.es';

import RollNotification from './RollNotification'; // Importar o componente de notificação

declare global {
  interface Window {
    DiceBoxInstance: any;
  }
}

interface DieResult {
  value: number;
  [key: string]: any;
}

interface GeneratedRollResults {
    total: number;
    individuals: number[];
    notation: string;
}

interface DiceProps {
  // containerId agora é apenas um ID PADRÃO, não uma prop que se refere a um elemento externo
  containerId?: string;
  onRollRequest?: (rollFn: (diceNotation: string, forcedValue?: number | 'random') => void) => void;
  onSendChatMessage?: (message: string, senderId?: number, senderName?: string, senderAvatar?: string) => void;
  // REMOVIDO: isVisible prop
}


const Dice: React.FC<DiceProps> = ({
  containerId = "dice-container", // ID padrão para a div que o Dice.tsx renderizará
  onRollRequest,
  onSendChatMessage,
}) => {
  const diceBoxRef = useRef<any>(null);
  const electron = (window as any).electron;
  const [rollNotification, setRollNotification] = useState<{
    message: string;
    type: 'success' | 'danger' | 'info' | 'warning';
    id: number;
  } | null>(null);

  const mainTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isDiceBoxReady, setIsDiceBoxReady] = useState(false);
  // NOVO: Estado para controlar a visibilidade da div interna do Dice.tsx
  const [isDiceContainerVisible, setIsDiceContainerVisible] = useState(true);


  const [currentRollNotation, setCurrentRollNotation] = useState<string>("2d20");
  const [currentForcedValue, setCurrentForcedValue] = useState<number | 'random' | undefined>('random');

  const initialRollCompletedRef = useRef(false);
  const initialRollAttemptedRef = useRef(false);

  // clearDiceBox não é mais usado para a visibilidade, mas é mantido como placeholder
  const clearDiceBox = useCallback(() => {
    // Implementação antiga de clearDiceBox() removida para evitar problemas
  }, []);

  const handleDiceBoxRollCompleteInternal = useCallback((rollResults: any) => {
    console.log('>>> ROLL COMPLETE CALLBACK INVOKED (ignoring for notification) <<<', rollResults);
  }, []);


  const triggerRoll = useCallback(
    (diceNotationParam: string, forcedValueParam?: number | 'random') => {
      // NOVO: Garante que o contêiner esteja visível antes de rolar
      setIsDiceContainerVisible(true);

      if (!isDiceBoxReady || !diceBoxRef.current) {
        console.warn("DiceBox not ready or instance not available. Cannot roll.");
        return false;
      }
      console.log(`Triggering roll for: ${diceNotationParam}, forcedValue: ${forcedValueParam}`);
      console.log("DiceBox instance is ready and available.");

      setCurrentRollNotation(diceNotationParam);
      setCurrentForcedValue(forcedValueParam);

      let finalNotation = diceNotationParam;

      const matchQuantity = diceNotationParam.match(/^(\d+)[dD]/);
      const matchSides = diceNotationParam.match(/[dD](\d+)$/);

      const numberOfDice = matchQuantity ? parseInt(matchQuantity[1]) : 1;
      const diceSides = matchSides ? parseInt(matchSides[1]) : 6;

      const generatedIndividualResults: number[] = [];
      let generatedTotalResult = 0;

      if (forcedValueParam !== undefined && forcedValueParam !== null && forcedValueParam !== 'random') {
          const forcedValueNum = forcedValueParam as number;
          for (let i = 0; i < numberOfDice; i++) {
              generatedIndividualResults.push(forcedValueNum);
              generatedTotalResult += forcedValueNum;
          }
          finalNotation = `${diceNotationParam}@${generatedIndividualResults.join(',')}`;
      } else {
          for (let i = 0; i < numberOfDice; i++) {
              const randomValue = Math.floor(Math.random() * diceSides) + 1;
              generatedIndividualResults.push(randomValue);
              generatedTotalResult += randomValue;
          }
          finalNotation = `${diceNotationParam}@${generatedIndividualResults.join(',')}`;
          console.log('VALORES ALEATÓRIOS GERADOS (MANUALMENTE):', generatedIndividualResults);
          console.log('NOTATION COM VALORES ALEATÓRIOS:', finalNotation);
      }

      const colors = [
        "#00ffcb", "#ff6600", "#1d66af", "#7028ed", "#c4c427", "#d81128"
      ];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      diceBoxRef.current.updateConfig({
        theme_customColorset: {
          background: randomColor,
          foreground: "#ffffff",
          texture: "marble",
          material: "metal"
        }
      });

      console.log(`Attempting diceBoxRef.current.roll(${finalNotation}, handleDiceBoxRollCompleteInternal);`);
      try {
        diceBoxRef.current.roll(finalNotation, handleDiceBoxRollCompleteInternal);

        if (mainTimerRef.current) {
            clearTimeout(mainTimerRef.current);
        }

        mainTimerRef.current = setTimeout(() => {
            console.log("Timer de 3 segundos disparado (no Dice.tsx)!");
            let notificationType: 'success' | 'danger' | 'info' = 'info';
            if (diceNotationParam.toLowerCase().includes('d20')) {
                if (generatedTotalResult === 20) {
                    notificationType = 'success';
                } else if (generatedTotalResult === 1) {
                    notificationType = 'danger';
                }
            }
            const messageToDisplay = `Rolagem ${diceNotationParam}: ${generatedIndividualResults.join(' + ')} = ${generatedTotalResult}!`;
            setRollNotification({
                message: messageToDisplay,
                type: notificationType,
                id: Date.now(),
            });
            if (onSendChatMessage) {
                electron.invoke("send-message", messageToDisplay,-1);
                // onSendChatMessage(messageToDisplay, DEFAULT_SYSTEM_SENDER_ID, DEFAULT_SYSTEM_SENDER_NAME, DEFAULT_SYSTEM_SENDER_AVATAR);
            }
            
        }, 3000);
       mainTimerRef.current = setTimeout(() => {
setIsDiceContainerVisible(false);
       }, 5000);
        return true;
      } catch (e) {
        console.error("Error during diceBox.roll():", e);
        // Em caso de erro, talvez manter visível ou resetar
        setIsDiceContainerVisible(true);
        return false;
      }
    },
    [isDiceBoxReady, handleDiceBoxRollCompleteInternal, onSendChatMessage]
  );

  const handleNotificationDismiss = useCallback(() => {
    setRollNotification(null);
  }, []);

  useEffect(() => {
    let checkContainerInterval: NodeJS.Timeout | null = null;

    const attemptInitializeDiceBox = async () => {
      // NOVO: Apenas tenta inicializar se o contêiner interno está visível
      if (!isDiceContainerVisible) {
          // Se não estiver visível, podemos adiar a inicialização, mas como ele já é renderizado aqui,
          // o foco é mais em evitar rolagens desnecessárias.
          // Para independência total, talvez seja melhor que o DiceApp não seja montado pelo ChatBox se não for usado.
          return;
      }

      const containerElement = document.getElementById(containerId);

      // NOVO: Verifica se o elemento existe e tem dimensões antes de inicializar
      if (!containerElement || containerElement.offsetWidth === 0 || containerElement.offsetHeight === 0) {
        // console.log(`Dice container #${containerId} not ready or not visible (offsetWidth/offsetHeight is 0). Retrying...`);
        return;
      }

      if (window.DiceBoxInstance) {
        console.log("DiceBox already initialized, reusing instance.");
        diceBoxRef.current = window.DiceBoxInstance;
        setIsDiceBoxReady(true);
        if (checkContainerInterval) clearInterval(checkContainerInterval);
        return;
      }

      const diceBoxConfig = {
        theme_customColorset: {
          background: "#00ffcb",
          foreground: "#ffffff",
          texture: "marble",
          material: "metal",
        },
        light_intensity: 1,
        gravity_multiplier: 600,
        baseScale: 100,
        strength: 2,
      };

      console.log(`Attempting to initialize DiceBox on #${containerId}`);
      const Box = new DiceBox(`#${containerId}`, diceBoxConfig);
      try {
        await Box.initialize();
        console.log("DiceBox initialized successfully.");
        diceBoxRef.current = Box;
        window.DiceBoxInstance = Box;
        setIsDiceBoxReady(true);
        if (checkContainerInterval) clearInterval(checkContainerInterval);

      } catch (error) {
        console.error("Failed to initialize DiceBox:", error);
        setIsDiceBoxReady(false);
      }
    };

    checkContainerInterval = setInterval(attemptInitializeDiceBox, 200);

    return () => {
      if (checkContainerInterval) {
        clearInterval(checkContainerInterval);
      }
      if (mainTimerRef.current) {
        clearTimeout(mainTimerRef.current);
      }
    };
  }, [containerId, isDiceContainerVisible]); // isDiceContainerVisible como dependência

  useEffect(() => {
    if (onRollRequest && isDiceBoxReady) {
      onRollRequest(triggerRoll);
    }
  }, [onRollRequest, triggerRoll, isDiceBoxReady]);

  // useEffect para a rolagem inicial, agora condicional à visibilidade


  return (
    // NOVO: A div #dice-container agora é renderizada AQUI, dentro do Dice.tsx
    <>
      <div
        id={containerId} // Usará "dice-container" por padrão
        style={{
          width: '100%',
          height: '300px', // Altura do contêiner do dado
          visibility: isDiceContainerVisible ? 'visible' : 'hidden', // Controlado pelo estado interno
          // Ou display: isDiceContainerVisible ? 'block' : 'none', se preferir remover do fluxo de layout
        }}
      />

      {rollNotification && (
        <RollNotification
          key={rollNotification.id}
          message={rollNotification.message}
          type={rollNotification.type}
          onDismiss={handleNotificationDismiss}
          duration={5000}
        />
      )}
    </>
  );
};

export default Dice;