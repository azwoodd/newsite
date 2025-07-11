const TimelineItem = ({ position, icon, title, text }) => {
    return (
      <div className={`relative w-full lg:w-1/2 px-10 mb-16 lg:mb-0 ${
        position === 'left' ? 'lg:left-0 lg:text-right' : 'lg:left-1/2 lg:text-left'
      }`}>
        <div className={`absolute w-[50px] h-[50px] rounded-full bg-deep border-2 border-accent flex items-center justify-center text-accent text-lg top-0 z-10 ${
          position === 'left' ? 'lg:right-[-25px]' : 'lg:left-[-25px]'
        } left-[15px]`}>
          <i className={`fas fa-${icon}`}></i>
        </div>
        <div className="bg-white/5 rounded-lg p-8 transition-transform duration-300 hover:transform hover:-translate-y-2">
          <h3 className="text-xl sm:text-2xl font-bold mb-4 text-accent">{title}</h3>
          <p className="text-light-muted">{text}</p>
        </div>
      </div>
    );
  };
  
  const ProcessSection = () => {
    const timelineItems = [
      {
        position: 'left',
        icon: 'pencil-alt',
        title: 'Share Your Story',
        text: 'Tell us about the special moments, memories, and emotions you want to capture. The more details you share, the more personal your song will be.'
      },
      {
        position: 'right',
        icon: 'guitar',
        title: 'Composition Process',
        text: 'Our creative team crafts custom lyrics and melodies that perfectly capture your story, transforming your memories into a beautiful song.'
      },
      {
        position: 'left',
        icon: 'microphone',
        title: 'Production',
        text: 'We record and produce your song with precision and care, ensuring every note and lyric resonates with the emotion of your story.'
      },
      {
        position: 'right',
        icon: 'sliders-h',
        title: 'Mixing & Mastering',
        text: 'Our production team perfects every element of your song, creating a polished, professional track that sounds amazing on any device.'
      },
      {
        position: 'left',
        icon: 'gift',
        title: 'Delivery & Enjoyment',
        text: "Receive your completed song digitally, ready to share with your loved ones. Create a moment they'll never forget with the gift of music."
      }
    ];
  
    return (
      <section id="process" className="relative py-20 bg-deep">
        <div className="absolute top-[-100px] left-0 w-full h-[100px] bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 1440 320%27%3E%3Cpath fill=%27%23070B16%27 fill-opacity=%271%27 d=%27M0,128L48,149.3C96,171,192,213,288,224C384,235,480,213,576,181.3C672,149,768,107,864,106.7C960,107,1056,149,1152,154.7C1248,160,1344,128,1392,112L1440,96L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z%27%3E%3C/path%3E%3C/svg%3E')] bg-cover"></div>
        
        <div className="container-custom">
          <div className="text-center mb-16 animate-on-scroll">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 relative inline-block">
              How We Create Your Song
              <span className="absolute w-20 h-0.5 bg-accent bottom-[-10px] left-1/2 transform -translate-x-1/2"></span>
            </h2>
            <p className="max-w-xl mx-auto text-light-muted">
              From your story to a finished song, we transform your memories into 
              beautiful music that captures your unique story.
            </p>
          </div>
          
          <div className="relative max-w-4xl mx-auto py-8">
            {/* Timeline Center Line */}
            <div className="absolute h-full w-0.5 bg-accent left-[40px] lg:left-1/2 top-0 transform lg:-translate-x-1/2"></div>
            
            {/* Timeline Items */}
            <div className="flex flex-col">
              {timelineItems.map((item, index) => (
                <TimelineItem 
                  key={index}
                  position={item.position}
                  icon={item.icon}
                  title={item.title}
                  text={item.text}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  };
  
  export default ProcessSection;