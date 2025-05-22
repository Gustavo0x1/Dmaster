import React, { useEffect, useRef } from "react";
import DiceBox from "../dice-box-threejs.es";

type DiceBoxConfig = {
  theme_customColorset: {
    background: string;
    foreground: string;
    texture: string;
    material: string;
  };
  light_intensity: number;
  gravity_multiplier: number;
  baseScale: number;
  strength: number;
  onRollComplete: (results: any) => void;
};

export default function DiceApp() {
  const diceRef = useRef<DiceBox | null>(null);

  useEffect(() => {
    const box = new DiceBox("#dice-container", {

      light_intensity: 1,
      gravity_multiplier: 600,
      baseScale: 100,
      strength: 2,
      onRollComplete: (results) => {
        console.log("Roll results:", results);
      },
    } as DiceBoxConfig);

    diceRef.current = box;

    box.initialize();

    // Cleanup opcional
    return () => {
      // Se a biblioteca fornecer um método de limpeza, adicione-o aqui
    };
  }, []);

  const rollDice = () => {
    if (!diceRef.current) return;

    const colors = [
      "#00ffcb",
      "#ff6600",
      "#1d66af",
      "#7028ed",
      "#c4c427",
      "#d81128",
    ];

    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const values = [1, 2, 3, 4, 5, 6];
    const randomVal = values[Math.floor(Math.random() * values.length)];



    diceRef.current.roll(`1d20`);
  };

  return (
    <div style={{ padding: "1rem" }}>
      <div
        id="dice-container"
        style={{ width: "1280px", height: "720px", marginBottom: "1rem"}}
      ></div>
      <button onClick={rollDice}>Roll Dice</button>
    </div>
  );
}
