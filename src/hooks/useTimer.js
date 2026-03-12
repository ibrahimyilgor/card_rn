import { useState, useEffect, useRef, useCallback } from "react";

export const useTimer = (initialTime = 30, onTimeUp = () => {}) => {
	const [timeLeft, setTimeLeft] = useState(initialTime);
	const [isRunning, setIsRunning] = useState(false);
	const intervalRef = useRef(null);
	const onTimeUpRef = useRef(onTimeUp);

	const clearTimerInterval = useCallback(() => {
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
	}, []);

	useEffect(() => {
		onTimeUpRef.current = onTimeUp;
	}, [onTimeUp]);

	useEffect(() => {
		if (!isRunning) {
			clearTimerInterval();
			return;
		}

		clearTimerInterval();
		intervalRef.current = setInterval(() => {
			setTimeLeft((prev) => {
				if (prev <= 1) {
					clearTimerInterval();
					setIsRunning(false);
					onTimeUpRef.current();
					return 0;
				}
				return prev - 1;
			});
		}, 1000);

		return () => {
			clearTimerInterval();
		};
	}, [isRunning, clearTimerInterval]);

	const start = useCallback(() => {
		setIsRunning(true);
	}, []);

	const pause = useCallback(() => {
		clearTimerInterval();
		setIsRunning(false);
	}, [clearTimerInterval]);

	const reset = useCallback(
		(newTime = initialTime) => {
			clearTimerInterval();
			setTimeLeft(newTime);
			setIsRunning(false);
		},
		[initialTime, clearTimerInterval],
	);

	const restart = useCallback(
		(newTime = initialTime) => {
			clearTimerInterval();
			setTimeLeft(newTime);
			setIsRunning(true);
		},
		[initialTime, clearTimerInterval],
	);

	const formatTime = useCallback((seconds) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	}, []);

	return {
		timeLeft,
		isRunning,
		start,
		pause,
		reset,
		restart,
		formattedTime: formatTime(timeLeft),
		percentage: (timeLeft / initialTime) * 100,
	};
};

export default useTimer;
