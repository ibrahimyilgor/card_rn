import { useState, useCallback } from 'react';

export const useLives = (initialLives = 3, onGameOver = () => {}) => {
  const [lives, setLives] = useState(initialLives);
  const [isGameOver, setIsGameOver] = useState(false);

  const loseLife = useCallback(() => {
    setLives((prev) => {
      const newLives = prev - 1;
      if (newLives <= 0) {
        setIsGameOver(true);
        onGameOver();
        return 0;
      }
      return newLives;
    });
  }, [onGameOver]);

  const gainLife = useCallback((amount = 1) => {
    setLives((prev) => prev + amount);
  }, []);

  const reset = useCallback((newLives = initialLives) => {
    setLives(newLives);
    setIsGameOver(false);
  }, [initialLives]);

  const getHearts = useCallback(() => {
    return Array(lives).fill('❤️').join('');
  }, [lives]);

  return {
    lives,
    isGameOver,
    loseLife,
    gainLife,
    reset,
    hearts: getHearts(),
  };
};

export default useLives;
