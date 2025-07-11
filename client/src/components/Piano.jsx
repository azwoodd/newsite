import { useEffect, useRef } from 'react';

const Piano = () => {
  const pianoRef = useRef(null);
  const noteFrequencies = {
    C: 261.63,
    'C#': 277.18,
    D: 293.66,
    'D#': 311.13,
    E: 329.63,
    F: 349.23,
    'F#': 369.99,
    G: 392.0,
    'G#': 415.3,
    A: 440.0,
    'A#': 466.16,
    B: 493.88,
    C2: 523.25
  };

  const playableNotes = Object.keys(noteFrequencies);

  useEffect(() => {
    createPianoKeys();
  }, []);

  const playNote = (note) => {
    const freq = noteFrequencies[note];
    if (!freq) return;

    const context = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = 'sine'; // Consider switching to 'triangle' or 'square' for variation
    oscillator.frequency.value = freq;

    oscillator.connect(gain);
    gain.connect(context.destination);
    gain.gain.setValueAtTime(0.2, context.currentTime);

    oscillator.start();
    oscillator.stop(context.currentTime + 0.4); // Play for 0.4s

    highlightKey(note);
  };

  const highlightKey = (note) => {
    const key = pianoRef.current?.querySelector(`[data-note='${note}']`);
    if (!key) return;

    const originalBg = key.style.background;
    const isBlack = key.classList.contains('black');
    key.style.background = isBlack ? 'var(--color-accent-alt)' : 'var(--color-accent)';
    key.style.transform = 'translateY(3px)';
    key.style.boxShadow = '0 0 8px rgba(255, 255, 255, 0.6)';

    setTimeout(() => {
      key.style.background = isBlack ? '#111' : '#fff';
      key.style.transform = 'translateY(0)';
      key.style.boxShadow = isBlack
        ? '0 5px 8px rgba(0, 0, 0, 0.6)'
        : '0 2px 3px rgba(0, 0, 0, 0.2)';
    }, 300);
  };

  const createPianoKeys = () => {
    if (!pianoRef.current) return;
    pianoRef.current.innerHTML = '';

    const whiteKeys = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C2'];
    const blackKeyPositions = {
      'C#': 0,
      'D#': 1,
      'F#': 3,
      'G#': 4,
      'A#': 5
    };
    const whiteKeyCount = whiteKeys.length;

    whiteKeys.forEach((note, i) => {
      const key = document.createElement('div');
      key.classList.add('piano-key');
      key.dataset.note = note;

      const keyWidth = 100 / whiteKeyCount;
      key.style.width = `${keyWidth}%`;
      key.style.left = `${i * keyWidth}%`;
      key.style.position = 'absolute';
      key.style.top = '8px';
      key.style.height = 'calc(100% - 15px)';
      key.style.background = '#fff';
      key.style.borderRadius = '0 0 5px 5px';
      key.style.boxShadow = '0 2px 3px rgba(0, 0, 0, 0.2)';
      key.style.cursor = 'pointer';
      key.style.transition = 'all 0.15s ease';
      key.style.borderLeft = '1px solid rgba(0, 0, 0, 0.1)';
      key.style.borderBottom = '1px solid rgba(0, 0, 0, 0.15)';

      const label = document.createElement('div');
      label.textContent = note;
      label.style.position = 'absolute';
      label.style.bottom = '10px';
      label.style.left = '50%';
      label.style.transform = 'translateX(-50%)';
      label.style.fontSize = '0.8rem';
      label.style.fontWeight = '700';
      key.appendChild(label);

      key.addEventListener('click', () => playNote(note));
      pianoRef.current.appendChild(key);
    });

    const blackKeys = ['C#', 'D#', 'F#', 'G#', 'A#'];
    const blackKeyWidth = (100 / whiteKeyCount) * 0.7;

    blackKeys.forEach((note) => {
      const pos = blackKeyPositions[note];
      if (pos === undefined) return;

      const key = document.createElement('div');
      key.classList.add('piano-key', 'black');
      key.dataset.note = note;

      const whiteKeyWidth = 100 / whiteKeyCount;
      const offset = whiteKeyWidth * 0.65;

      key.style.width = `${blackKeyWidth}%`;
      key.style.left = `${(pos * whiteKeyWidth) + offset}%`;
      key.style.position = 'absolute';
      key.style.top = '8px';
      key.style.height = '60%';
      key.style.background = '#111';
      key.style.zIndex = '10';
      key.style.borderRadius = '0 0 3px 3px';
      key.style.boxShadow = '0 5px 8px rgba(0, 0, 0, 0.6)';
      key.style.cursor = 'pointer';
      key.style.transition = 'all 0.15s ease';

      const label = document.createElement('div');
      label.textContent = note;
      label.style.position = 'absolute';
      label.style.bottom = '8px';
      label.style.left = '50%';
      label.style.transform = 'translateX(-50%)';
      label.style.fontSize = '0.7rem';
      label.style.fontWeight = '700';
      label.style.color = '#fff';
      key.appendChild(label);

      key.addEventListener('click', () => playNote(note));
      pianoRef.current.appendChild(key);
    });
  };

  return (
    <div className="relative h-[250px] md:h-[280px] sm:h-[180px] max-w-[700px] mx-auto mb-0 perspective-800">
      <div
        ref={pianoRef}
        className="absolute w-full h-full transform-preserve-3d rotate-x-[5deg] block z-5 rounded-b-lg shadow-xl bg-[#111] p-[8px_10px_15px] border border-black"
      ></div>
    </div>
  );
};

export default Piano;
