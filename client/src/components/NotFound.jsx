import { Link } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import logo from '../assets/logo.png';

const NotFound = () => {
  const canvasRef = useRef(null);
  
  // Audio visualizer effect (similar to HeroSection)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    const drawVisualizer = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Create gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, 'rgba(26, 26, 26, 1)');
      gradient.addColorStop(1, 'rgba(44, 44, 44, 1)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw circular audio waves
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const maxRadius = Math.min(canvas.width, canvas.height) * 0.4;
      
      for (let i = 0; i < 3; i++) {
        const time = Date.now() * 0.001;
        const wave = Math.sin(time * (i + 1) * 0.5) * 0.5 + 0.5;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, maxRadius * (0.5 + i * 0.2) * wave, 0, Math.PI * 2);
        ctx.strokeStyle = i === 1 
          ? `rgba(196, 160, 100, ${0.1 + wave * 0.2})` // Artisan Gold
          : `rgba(211, 178, 117, ${0.1 + wave * 0.2})`; // Radiant Brass
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      requestAnimationFrame(drawVisualizer);
    };
    
    drawVisualizer();
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <div className="min-h-screen overflow-hidden relative flex flex-col items-center justify-center text-center px-4">
      {/* Background */}
      <canvas 
        ref={canvasRef} 
        className="absolute top-0 left-0 w-full h-full z-0"
      ></canvas>
      
      {/* Content */}
      <div className="relative z-10 max-w-md">
        <Link to="/" className="mx-auto block mb-8">
          <img src={logo} alt="SongSculptors Logo" className="h-16 mx-auto" />
        </Link>
        
        <h1 className="text-8xl font-bold mb-4 font-secondary text-accent">404</h1>
        <h2 className="text-2xl font-semibold mb-6">Page Not Found</h2>
        
        <p className="text-light-muted mb-8">
          Oops! The page you're looking for doesn't exist. Perhaps the music has led you astray.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            to="/"
            className="px-6 py-3 bg-transparent border-2 border-accent text-white font-semibold rounded-full hover:bg-accent/10 transition-all duration-300 hover:shadow-[0_0_15px_rgba(196,160,100,0.5)]"
          >
            <i className="fas fa-home mr-2"></i>
            Back to Home
          </Link>
          
          <Link 
            to="/showcase"
            className="px-6 py-3 bg-transparent border-2 border-accent-alt text-white font-semibold rounded-full hover:bg-accent-alt/10 transition-all duration-300 hover:shadow-[0_0_15px_rgba(211,178,117,0.5)]"
          >
            <i className="fas fa-headphones mr-2"></i>
            Explore Showcase
          </Link>
        </div>
      </div>
      
      {/* Music Notes */}
      <div className="fixed bottom-0 left-0 w-full h-[200px] pointer-events-none">
        {[...Array(6)].map((_, i) => {
          const notes = ['♪', '♫', '♬', '♩', '♭', '♯'];
          const randomNote = notes[Math.floor(Math.random() * notes.length)];
          const randomLeft = Math.random() * 100;
          const randomSize = 1 + Math.random() * 2;
          const randomDelay = Math.random() * 5;
          
          return (
            <div
              key={i}
              className="absolute bottom-0 text-accent animate-float"
              style={{
                left: `${randomLeft}%`,
                fontSize: `${randomSize}rem`,
                animationDelay: `${randomDelay}s`
              }}
            >
              {randomNote}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NotFound;