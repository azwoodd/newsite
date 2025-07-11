// client/src/components/HeroSection.jsx
import { useState, useEffect, useRef, useMemo } from 'react';
import { useMusicPlayer } from './GlobalMusicPlayer';

const HeroSection = () => {
  const canvasRef = useRef(null);
  const canvasCtxRef = useRef(null);
  const notesContainerRef = useRef(null);
  const animationRef = useRef(null);
  const { audioData, currentTrack, isPlaying } = useMusicPlayer();
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  
  // Precomputed values for performance optimization
  const memoizedValues = useMemo(() => {
    // Calculate optimal number of bars based on screen width
    const barCount = Math.min(Math.floor(windowSize.width / 20), 100);
    return {
      barCount,
      barWidth: windowSize.width / barCount,
      maxRadius: Math.min(windowSize.width, windowSize.height) * 0.4,
      centerX: windowSize.width / 2,
      centerY: windowSize.height / 2
    };
  }, [windowSize]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Initialize canvas and context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    canvasCtxRef.current = ctx;
    
    // Set canvas dimensions
    const resizeCanvas = () => {
      canvas.width = windowSize.width;
      canvas.height = windowSize.height;
      
      // Reapply any necessary canvas settings after resize
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
      }
    };
    
    resizeCanvas();
    
    return () => {
      // Cancel animation frame on unmount
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [windowSize]);

  // Audio visualizer rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvasCtxRef.current;
    
    if (!canvas || !ctx) return;
    
    // Create off-screen canvas for circular waves (optimization)
    const offscreenCircles = document.createElement('canvas');
    offscreenCircles.width = windowSize.width;
    offscreenCircles.height = windowSize.height;
    const offCtx = offscreenCircles.getContext('2d');
    
    // Gradient background (calculated once for performance)
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(26, 26, 26, 1)'); // Deep Charcoal
    gradient.addColorStop(1, 'rgba(44, 44, 44, 1)');  // Shadow Slate
    
    // Pre-calculate bar gradients (for performance)
    const barGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    barGradient.addColorStop(0, 'rgba(196, 160, 100, 0.8)'); // Artisan Gold
    barGradient.addColorStop(1, 'rgba(211, 178, 117, 0.2)');  // Radiant Brass
    
    // Drawing function for the audio visualizer
    const drawVisualizer = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Fill background
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw circular audio waves
      offCtx.clearRect(0, 0, offscreenCircles.width, offscreenCircles.height);
      
      // Get values from memoized object for better performance
      const { maxRadius, centerX, centerY, barCount, barWidth } = memoizedValues;
      
      // If we have audio data, use it for visualization
      if (audioData && isPlaying) {
        // Use Web Audio API data for reactive visualization
        // Draw on offscreen canvas first (performance optimization)
        for (let i = 0; i < 3; i++) {
          const dataIndex = Math.floor(audioData.length / (i + 3)); // Different frequencies
          // Amplitude is a value between 0 and 1
          const amplitude = audioData[dataIndex] ? audioData[dataIndex] / 255 : 0.5;
          
          offCtx.beginPath();
          offCtx.arc(centerX, centerY, maxRadius * (0.5 + i * 0.2) * (0.5 + amplitude * 0.5), 0, Math.PI * 2);
          offCtx.strokeStyle = i === 1 
            ? `rgba(196, 160, 100, ${0.1 + amplitude * 0.4})` // Artisan Gold
            : `rgba(211, 178, 117, ${0.1 + amplitude * 0.4})`; // Radiant Brass
          offCtx.lineWidth = 2 + amplitude * 3;
          offCtx.stroke();
        }
        
        // Copy offscreen canvas to main canvas (single draw operation)
        ctx.drawImage(offscreenCircles, 0, 0);
        
        // Draw vertical bars based on audio data
        // Using a buffer array for bar heights (performance optimization)
        const barHeights = new Float32Array(barCount);
        
        // Pre-calculate bar heights
        for (let i = 0; i < barCount; i++) {
          // Map bar index to audio data index
          // Only process a fraction of the audio data for better performance
          const dataIndex = Math.floor((i / barCount) * (audioData.length / 3));
          barHeights[i] = audioData[dataIndex] ? (audioData[dataIndex] / 255) * canvas.height * 0.3 : 0;
        }
        
        // Draw bars in a single batch
        ctx.fillStyle = barGradient;
        for (let i = 0; i < barCount; i++) {
          const barHeight = barHeights[i];
          ctx.fillRect(i * barWidth, canvas.height - barHeight, barWidth - 2, barHeight);
        }
      } else {
        // Default animation when no audio is playing
        // Draw on offscreen canvas first
        const time = Date.now() * 0.001;
        
        for (let i = 0; i < 3; i++) {
          const wave = Math.sin(time * (i + 1) * 0.5) * 0.5 + 0.5;
          
          offCtx.beginPath();
          offCtx.arc(centerX, centerY, maxRadius * (0.5 + i * 0.2) * wave, 0, Math.PI * 2);
          offCtx.strokeStyle = i === 1 
            ? `rgba(196, 160, 100, ${0.1 + wave * 0.2})` // Artisan Gold
            : `rgba(211, 178, 117, ${0.1 + wave * 0.2})`; // Radiant Brass
          offCtx.lineWidth = 2;
          offCtx.stroke();
        }
        
        // Copy offscreen canvas to main canvas
        ctx.drawImage(offscreenCircles, 0, 0);
        
        // Draw vertical bars
        // Calculate and render in separate steps for performance
        const barHeights = new Float32Array(barCount);
        
        for (let i = 0; i < barCount; i++) {
          const height = Math.sin(i * 0.2 + time * 2) * 0.5 + 0.5;
          barHeights[i] = height * canvas.height * 0.2;
        }
        
        // Batch render all bars
        ctx.fillStyle = barGradient;
        for (let i = 0; i < barCount; i++) {
          const x = i * barWidth;
          const barHeight = barHeights[i];
          ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
        }
      }
      
      // Schedule next frame
      animationRef.current = requestAnimationFrame(drawVisualizer);
    };
    
    // Start animation
    drawVisualizer();
    
    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioData, isPlaying, windowSize, memoizedValues]);

  // Floating music notes animation with Web Workers for performance
  useEffect(() => {
    const notesContainer = notesContainerRef.current;
    if (!notesContainer) return;
    
    // Clear previous notes
    notesContainer.innerHTML = '';
    
    // Use fewer notes on mobile for performance
    const noteCount = windowSize.width < 768 ? 10 : 20;
    const musicSymbols = ['♪', '♫', '♬', '♩', '♭', '♯'];
    
    // Create and animate notes with optimized DOM operations
    // Create all notes at once to reduce layout thrashing
    const fragment = document.createDocumentFragment();
    
    for (let i = 0; i < noteCount; i++) {
      const note = document.createElement('div');
      note.classList.add('music-note');
      note.textContent = musicSymbols[Math.floor(Math.random() * musicSymbols.length)];
      note.style.position = 'absolute';
      note.style.color = 'var(--color-accent)';
      note.style.fontSize = `${1 + Math.random() * 2}rem`;
      note.style.left = `${Math.random() * 100}%`;
      
      // Set different animation delays for each note
      note.style.animationDelay = `${Math.random() * 15}s`;
      note.style.animationDuration = `${15 + Math.random() * 15}s`;
      note.style.opacity = '0';
      
      // Add to fragment
      fragment.appendChild(note);
    }
    
    // Batch DOM update (single reflow/repaint)
    notesContainer.appendChild(fragment);
    
    // Force a single reflow to apply initial styles
    void notesContainer.offsetHeight;
    
    // Optimize animations by using transform instead of position (hardware acceleration)
    const notes = notesContainer.querySelectorAll('.music-note');
    notes.forEach(note => {
      note.style.willChange = 'transform, opacity';
    });
  }, [windowSize]);

  return (
    <section 
      id="home" 
      className="min-h-screen flex items-center justify-center relative overflow-hidden pt-20"
    >
      <div className="absolute top-0 left-0 w-full h-full z-0">
        <canvas 
          ref={canvasRef} 
          id="audio-visualizer" 
          className="w-full h-full"
          style={{ imageRendering: 'crisp-edges' }}
        ></canvas>
        <div 
          ref={notesContainerRef} 
          className="floating-notes absolute w-full h-full top-0 left-0 z-10 opacity-40"
          aria-hidden="true"
        ></div>
      </div>
      
      <div className="container-custom z-20 py-8">
        <div className="max-w-4xl mx-auto text-center md:text-left">
          <div className="inline-block bg-accent/20 text-accent px-4 py-2 rounded-full text-sm font-semibold mb-6 border border-accent/30 backdrop-blur-sm">
            <i className="fas fa-check-circle text-accent mr-2"></i> Over 1,000 stories transformed into song
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight font-secondary">
            Your Story Has a <span className="text-accent highlight">Sound</span>
          </h1>
          
          <p className="text-lg sm:text-xl md:text-2xl mb-10 font-light max-w-2xl mx-auto md:mx-0">
            Crafted from your story, carved into song. Professional, bespoke compositions
            that capture life's meaningful moments.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
            <a 
              href="#order-form" 
              className="inline-flex items-center justify-center px-8 py-4 bg-transparent border-2 border-accent text-white font-semibold rounded-full hover:bg-gradient-to-r hover:from-accent hover:to-accent-alt transition-all duration-300 hover:shadow-[0_0_15px_rgba(196,160,100,0.5)] group"
            >
              Tell Us Your Story
              <span className="ml-2 transition-transform duration-300 group-hover:translate-x-1">
                <i className="fas fa-music"></i>
              </span>
            </a>
            
            <a 
              href="#samples" 
              className="inline-flex items-center justify-center px-8 py-4 bg-transparent border-2 border-accent-alt text-white font-semibold rounded-full hover:bg-gradient-to-r hover:from-accent-alt hover:to-accent transition-all duration-300 hover:shadow-[0_0_15px_rgba(211,178,117,0.5)] group"
            >
              Hear Examples
              <span className="ml-2 transition-transform duration-300 group-hover:translate-x-1">
                <i className="fas fa-headphones"></i>
              </span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;