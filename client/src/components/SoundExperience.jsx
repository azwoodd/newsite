import Piano from './Piano';

const SoundExperience = () => {
  return (
    <section id="experience" className="relative py-20 bg-gradient-to-b from-dark to-deep overflow-hidden">
      <div className="container-custom">
        <div className="text-center mb-16 animate-on-scroll">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 relative inline-block">
            Feel The Music
            <span className="absolute w-20 h-0.5 bg-accent bottom-[-10px] left-1/2 transform -translate-x-1/2"></span>
          </h2>
          <p className="max-w-xl mx-auto text-light-muted">
            Music is more than just sound. It's emotion. Try our interactive experience 
            to get a feel for what we create.
          </p>
        </div>
        
        <Piano />
      </div>
    </section>
  );
};

export default SoundExperience;