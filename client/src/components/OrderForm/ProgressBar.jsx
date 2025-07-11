const ProgressBar = ({ currentStep, setCurrentStep }) => {
  const steps = [
    { number: 1, label: 'Your Story', emotion: 'romantic' },
    { number: 2, label: 'Package', emotion: 'nostalgic' },
    { number: 3, label: 'Enhancements', emotion: 'happy' },
    { number: 4, label: 'Checkout', emotion: 'powerful' }
  ];

  // Calculate progress percentage
  const progressPercent = ((currentStep - 1) / (steps.length - 1)) * 100;
  
  // Handle step click for navigation - Always allow navigation
  const handleStepClick = (stepNumber) => {
    setCurrentStep(stepNumber);
  };

  return (
    // Removed overflow-x-auto to fix the horizontal scrollbar issue
    // Added flex-wrap wrap to ensure responsive layout without scrolling
    <div className="relative max-w-[700px] mx-auto mb-10 w-full pb-4 px-2">
      {/* Progress Indicator Line */}
      <div className="absolute top-1/2 left-0 h-0.5 w-full bg-white/20 -translate-y-1/2 z-10"></div>
      
      {/* Colored Progress Bar */}
      <div 
        className="absolute top-1/2 left-0 h-0.5 bg-gradient-to-r from-romantic via-nostalgic to-happy z-20 bg-gradient-animate -translate-y-1/2 transition-all duration-300"
        style={{ width: `${progressPercent}%` }}
      ></div>
      
      {/* Steps */}
      <div className="flex justify-between relative z-30 min-w-[300px] flex-wrap">
        {steps.map((step) => {
          const isActive = step.number === currentStep;
          const isCompleted = step.number < currentStep;
          
          // Determine the color based on the step's emotion
          let emotionColor;
          switch(step.emotion) {
            case 'romantic': emotionColor = 'var(--color-romantic)'; break;
            case 'nostalgic': emotionColor = 'var(--color-nostalgic)'; break;
            case 'happy': emotionColor = 'var(--color-happy)'; break;
            case 'powerful': emotionColor = 'var(--color-powerful)'; break;
            case 'peaceful': emotionColor = 'var(--color-peaceful)'; break;
            default: emotionColor = 'var(--color-accent)';
          }
          
          return (
            <button 
              key={step.number} 
              className="flex flex-col items-center cursor-pointer py-2"
              onClick={() => handleStepClick(step.number)}
              aria-current={isActive ? 'step' : undefined}
            >
              <div 
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold z-30 transition-all duration-300 ${
                  isActive || isCompleted 
                    ? 'border-2 border-solid' 
                    : 'bg-white/10 border-2 border-white/20'
                }`}
                style={{ 
                  backgroundColor: (isActive || isCompleted) ? emotionColor : 'rgba(255, 255, 255, 0.1)',
                  borderColor: (isActive || isCompleted) ? emotionColor : 'rgba(255, 255, 255, 0.2)',
                  boxShadow: isActive ? `0 0 0 4px ${emotionColor}30` : 'none',
                  transform: isActive ? 'scale(1.1)' : 'scale(1)'
                }}
              >
                {isCompleted ? (
                  <i className="fas fa-check text-white text-xs sm:text-base"></i>
                ) : (
                  <span className="text-xs sm:text-base">{step.number}</span>
                )}
              </div>
              
              {/* Step Label */}
              <span 
                className={`mt-2 text-xs sm:text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                  isActive 
                    ? 'transform -translate-y-0.5 font-semibold' 
                    : ''
                }`}
                style={{ 
                  color: isActive ? emotionColor : isCompleted ? 'var(--color-light)' : 'var(--color-light-muted)',
                  opacity: isActive ? 1 : isCompleted ? 0.9 : 0.7
                }}
              >
                {step.label}
              </span>
            </button>
          );
        })}
      </div>
      
      {/* Emotion Indicator */}
      <div className="absolute bottom-[-24px] left-0 w-full text-center text-xs text-muted opacity-0 transform translate-y-2.5 transition-all duration-300 hover:opacity-100 hover:translate-y-0">
        Your journey: Sharing → Choosing → Enhancing → Completing
      </div>
    </div>
  );
};

export default ProgressBar;