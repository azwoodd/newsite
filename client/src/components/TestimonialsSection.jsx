import { useState, useEffect, useRef } from 'react';

const TestimonialsSection = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const trackRef = useRef(null);
  const intervalRef = useRef(null);

  const testimonials = [
    {
      text: "I couldn't believe how perfectly they captured our story. The song brought my wife to tears on our anniversary. It's become our special song that we'll cherish forever.",
      name: "Jason Thompson",
      initials: "JT",
      detail: "10th Anniversary Song"
    },
    {
      text: "The team was incredibly responsive to my feedback. They created the perfect song for my proposal, and she said yes! Now we have a beautiful song that tells our unique love story.",
      name: "Robert Miller",
      initials: "RM",
      detail: "Proposal Song"
    },
    {
      text: "I was skeptical at first, but they delivered a song that felt like it was written by someone who's known us for years. Amazing talent and professionalism from start to finish.",
      name: "Kimberly Johnson",
      initials: "KJ", 
      detail: "Wedding Song"
    }
  ];

  // Handle slide change
  const goToSlide = (index) => {
    let slideIndex = index;
    if (slideIndex < 0) slideIndex = testimonials.length - 1;
    if (slideIndex >= testimonials.length) slideIndex = 0;
    
    setCurrentSlide(slideIndex);
    
    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(-${slideIndex * 100}%)`;
    }
  };

  // Previous and next button handlers
  const prevSlide = () => goToSlide(currentSlide - 1);
  const nextSlide = () => goToSlide(currentSlide + 1);

  // Auto slide every 5 seconds
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      goToSlide(currentSlide + 1);
    }, 5000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [currentSlide]);

  return (
    <section id="testimonials" className="relative py-20 bg-dark">
      <div className="absolute top-[-100px] left-0 w-full h-[100px] bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 1440 320%27%3E%3Cpath fill=%27%230A1128%27 fill-opacity=%271%27 d=%27M0,192L48,181.3C96,171,192,149,288,149.3C384,149,480,171,576,192C672,213,768,235,864,208C960,181,1056,107,1152,85.3C1248,64,1344,96,1392,112L1440,128L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z%27%3E%3C/path%3E%3C/svg%3E')] bg-cover"></div>
      
      <div className="container-custom">
        <div className="text-center mb-16 animate-on-scroll">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 relative inline-block">
            Real Stories, Real Impact
            <span className="absolute w-20 h-0.5 bg-accent bottom-[-10px] left-1/2 transform -translate-x-1/2"></span>
          </h2>
          <p className="max-w-xl mx-auto text-light-muted">
            Hear what our clients say about their custom song experience.
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto relative overflow-hidden">
          {/* Testimonial Slides */}
          <div 
            ref={trackRef}
            className="flex transition-transform duration-700 ease-in-out"
          >
            {testimonials.map((testimonial, index) => (
              <div key={index} className="min-w-full px-4">
                <div className="bg-white/5 rounded-lg p-10 relative text-center">
                  <div className="text-5xl text-accent opacity-30 absolute top-4 left-6">❝</div>
                  <p className="text-lg sm:text-xl italic mb-8 relative z-10">"{testimonial.text}"</p>
                  
                  <div className="flex flex-col items-center">
                    <div 
                      className="w-[70px] h-[70px] rounded-full bg-accent mb-4 flex items-center justify-center font-bold text-2xl text-white"
                    >
                      {testimonial.initials}
                    </div>
                    <div className="font-bold text-lg mb-1">{testimonial.name}</div>
                    <div className="text-muted text-sm">{testimonial.detail}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Testimonial Controls */}
          <div className="flex justify-center gap-4 mt-8">
            <button 
              onClick={prevSlide}
              className="w-[50px] h-[50px] rounded-full bg-transparent border-2 border-accent text-accent flex items-center justify-center hover:bg-accent hover:text-white transition-colors duration-200"
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            <button 
              onClick={nextSlide}
              className="w-[50px] h-[50px] rounded-full bg-transparent border-2 border-accent text-accent flex items-center justify-center hover:bg-accent hover:text-white transition-colors duration-200"
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
          
          {/* Testimonial Dots */}
          <div className="flex justify-center gap-2 mt-8">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${
                  currentSlide === index 
                    ? 'bg-accent scale-125' 
                    : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;